/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TfRefMeta, TfUnionMeta, TfVariantMeta } from '@kbn/zod';

// Reads the Dashboards API OpenAPI document and compiles it, together with its `x-tf-*` extensions (authored in
// Kibana's Zod schemas with the `@kbn/zod` `tf*` helpers), into a small Terraform-oriented model.
//
// Conventions that need no annotation: a union of primitives is its primitive; a union of objects with no `x-tf-union`
// is a JSON leaf, and so is a property whose merged variants cannot be combined (a CI check requires each such leaf to
// be accepted explicitly, see `unmapped_unions.ts`); `allOf[union, object]` distributes the object into every branch
// of the union. Mapping mistakes the document can reveal (an override or a JSON-leaf path
// that matches nothing, an unsupported `allOf`) throw instead of producing a quietly different tree.

export const ROOT_COMPONENT = 'Kibana_HTTP_APIs_kbn-dashboard-data';
// Sections are a documented special case, not a mapping feature: the API interleaves sections and panels in
// `panels[]`, while the provider keeps two lists. There is one instance, so there is no general "split" capability.
export const SECTION_COMPONENT = 'Kibana_HTTP_APIs_kbn-dashboard-section';

/** The parts of an OpenAPI schema object the compiler reads. */
export interface OasSchema {
  $ref?: string;
  type?: string;
  title?: string;
  enum?: ReadonlyArray<string | number | boolean | null>;
  properties?: Record<string, OasSchema>;
  additionalProperties?: boolean | OasSchema;
  required?: string[];
  items?: OasSchema;
  anyOf?: OasSchema[];
  oneOf?: OasSchema[];
  allOf?: OasSchema[];
  'x-tf-union'?: TfUnionMeta;
  'x-tf-union-override'?: Partial<TfUnionMeta>;
  'x-tf-variant'?: TfVariantMeta;
  'x-tf-json-leaf'?: true | { attribute: string };
  'x-tf-flatten'?: true;
  'x-tf-unwrap'?: true;
  'x-tf-omit'?: true;
  'x-tf-ref'?: TfRefMeta;
  /** Compiler-internal: the attribute name a `json_leaves` entry gives this property. */
  jsonName?: string;
  /** Compiler-internal: the discriminator to drop from this branch once its own union is merged. */
  dropProperty?: string;
  /** Compiler-internal: a JSON leaf no annotation asked for (merged variants define this property differently). */
  implicitLeaf?: true;
  /** Compiler-internal: the definitions an implicit leaf merged, where references inside it are found. */
  leafOf?: OasSchema[];
}

/**
 * Where `x-tf-ref` IDs sit inside a value the model keeps as a JSON string: only the parts that can hold one. An object
 * applies only to a value whose single-value properties (discriminators) match; `lazy` closes a recursive schema.
 */
export type RefFinder =
  | { k: 'ref'; ref: TfRefMeta }
  | { k: 'object'; props: Record<string, RefFinder>; consts: Record<string, string> }
  | { k: 'list'; items: RefFinder }
  | { k: 'map'; values: RefFinder }
  | { k: 'any'; branches: RefFinder[] }
  | { k: 'lazy'; get: () => RefFinder | undefined };

export interface OasDocument {
  components: { schemas: Record<string, OasSchema> };
}

export interface Prop {
  apiName: string;
  tfName: string;
  node: TNode;
  required: boolean;
  flatten?: boolean;
  /** The API value is an object with this single property; the attribute holds that property's value (`node`). */
  unwrap?: string;
}

export interface Variant {
  key: string;
  /** Discriminator values recognized as this variant. */
  values: string[];
  content: TNode;
  /** How a structural union recognizes this variant. */
  match?: TfVariantMeta['match'];
  /** The discriminator stays in the variant body. */
  keepDiscriminator: boolean;
  /** References inside the variant body when it is written whole as the union's extra JSON-string variant. */
  jsonRefs?: RefFinder;
}

export type TNode =
  | { k: 'prim'; type: 'string' | 'number' | 'bool'; ref?: TfRefMeta }
  | { k: 'json'; attribute?: string; refs?: RefFinder }
  | { k: 'object'; props: Prop[] }
  | { k: 'list'; items: TNode }
  | {
      k: 'keyed';
      m: TfUnionMeta;
      disc?: string;
      discOutside: boolean;
      outside: Prop[];
      variants: Variant[];
    };

export type KeyedNode = Extract<TNode, { k: 'keyed' }>;

const refName = (raw: OasSchema): string | undefined => raw.$ref?.split('/').pop();

export class Compiler {
  readonly schemas: Record<string, OasSchema>;
  /**
   * Locations of the JSON leaves no annotation asked for: unions of objects with no `x-tf-union`, and properties that
   * merged variants define differently. A location is the nearest component, then the property path inside it
   * (`.prop`, `[]` for array items, `|key` for an inline branch).
   */
  readonly implicitJsonLeaves = new Set<string>();
  // Reference finders by component; null when the component holds no reference.
  private readonly finders = new Map<string, RefFinder | null>();

  constructor(doc: OasDocument) {
    this.schemas = doc.components.schemas;
  }

  /** Where references sit inside values of this schema, for a value kept as a JSON string; undefined when nowhere. */
  refFinder(raw: OasSchema, stack: string[] = []): RefFinder | undefined {
    // Use-site siblings of a `$ref` may change it, so only a bare `$ref` is cached.
    const name = Object.keys(raw).length === 1 ? refName(raw) : undefined;
    if (name) {
      const cached = this.finders.get(name);
      if (cached !== undefined) return cached ?? undefined;
      if (stack.includes(name))
        return { k: 'lazy', get: () => this.finders.get(name) ?? undefined };
    }
    const finder = this.findRefs(this.normalize(raw), name ? [...stack, name] : stack);
    if (name) this.finders.set(name, finder ?? null);
    return finder;
  }

  private findRefs(s: OasSchema, stack: string[]): RefFinder | undefined {
    const ref = s['x-tf-ref'];
    if (ref)
      return s.type === 'array' ? { k: 'list', items: { k: 'ref', ref } } : { k: 'ref', ref };
    const branches = s.leafOf ?? this.unionBranches(s);
    if (branches) {
      const found = branches.flatMap((b) => this.refFinder(b, stack) ?? []);
      return found.length ? { k: 'any', branches: found } : undefined;
    }
    if (s.type === 'array') {
      const items = s.items && this.refFinder(s.items, stack);
      return items && { k: 'list', items };
    }
    const props: Record<string, RefFinder> = {};
    const consts: Record<string, string> = {};
    for (const [propName, prop] of Object.entries(s.properties ?? {})) {
      const { enum: values } = this.resolve(prop);
      if (values?.length === 1 && typeof values[0] === 'string') consts[propName] = values[0];
      const found = this.refFinder(prop, stack);
      if (found) props[propName] = found;
    }
    if (Object.keys(props).length) return { k: 'object', props, consts };
    const values =
      typeof s.additionalProperties === 'object' && this.refFinder(s.additionalProperties, stack);
    return values ? { k: 'map', values } : undefined;
  }

  /** Follow `$ref`s; siblings of a `$ref` (use-site metadata) override the target's. */
  resolve(raw: OasSchema): OasSchema {
    let node = raw;
    let siblings: OasSchema = {};
    const seen = new Set<string>();
    while (node.$ref) {
      const { $ref, ...rest } = node;
      siblings = { ...rest, ...siblings };
      if (seen.has($ref)) throw new Error(`ref cycle ${$ref}`);
      seen.add($ref);
      const target = this.schemas[refName(node) ?? ''];
      if (!target) throw new Error(`unresolved ${$ref}`);
      node = target;
    }
    return Object.keys(siblings).length ? { ...node, ...siblings } : node;
  }

  unionBranches(raw: OasSchema): OasSchema[] | undefined {
    return raw.anyOf ?? raw.oneOf;
  }

  /** Resolve and, unless it hides a union, merge `allOf` parts into one object schema. */
  normalize(raw: OasSchema): OasSchema {
    const s = this.resolve(raw);
    if (!s.allOf) return s;
    const parts = s.allOf.map((p) => this.normalize(p));
    const { allOf, ...own } = s;
    // A single-part allOf is a use-site wrapper (description, extensions) around one schema.
    if (parts.length === 1 && !own.properties) return { ...parts[0], ...own };
    const unionPart = parts.find((p) => this.unionBranches(p) && !p.properties);
    if (unionPart) {
      // Convention: allOf[union, object...] -> union whose branches each get the object parts (vis by-value).
      const { anyOf, oneOf, ...unionOwn } = unionPart;
      const { properties, required, ...ownRest } = own;
      const objectParts = [
        ...parts.filter((p) => p !== unionPart),
        ...(properties ? [{ type: 'object', properties, required }] : []),
      ];
      return {
        ...unionOwn,
        ...ownRest,
        anyOf: (anyOf ?? oneOf ?? []).map((b) => ({ allOf: [b, ...objectParts] })),
      };
    }
    const notObject = parts.find((p) => !p.properties && p.type !== 'object');
    if (notObject)
      throw new Error(`unsupported allOf with a non-object part (${s.title ?? 'untitled'})`);
    return parts.reduce((acc, p) => this.mergeObjects(acc, p, 'all'), own);
  }

  /** Merge two object schemas. `all` = allOf semantics (required: union); `any` = merged variants (intersection). */
  mergeObjects(a: OasSchema, b: OasSchema, mode: 'all' | 'any'): OasSchema {
    const props: Record<string, OasSchema> = { ...(a.properties ?? {}) };
    for (const [k, v] of Object.entries(b.properties ?? {})) {
      const existing = props[k];
      props[k] = existing ? this.mergeTwo(existing, v, k, mode) : v;
    }
    const ra = a.required ?? [];
    const rb = b.required ?? [];
    const required =
      mode === 'all'
        ? [...new Set([...ra, ...rb])]
        : ra.filter((r) => rb.includes(r) && props[r] !== undefined);
    const extensions = Object.fromEntries(
      Object.entries({ ...b, ...a }).filter(([k]) => k.startsWith('x-tf') || k === 'title')
    );
    return { ...extensions, type: 'object', properties: props, required };
  }

  /**
   * Combine the same property from two merged schemas. In `any` mode (merged variants), a property the variants
   * define incompatibly becomes a JSON leaf; in `all` mode (allOf) that is a contradiction in the document.
   */
  mergeTwo(a: OasSchema, b: OasSchema, name: string, mode: 'all' | 'any'): OasSchema {
    if (JSON.stringify(a) === JSON.stringify(b)) return a;
    const na = this.normalize(a);
    const nb = this.normalize(b);
    if (JSON.stringify(na) === JSON.stringify(nb)) return a;
    if (na['x-tf-json-leaf'] && nb['x-tf-json-leaf']) return a; // both already JSON leaves (json_leaves)
    const ua = this.unionBranches(na);
    const ub = this.unionBranches(nb);
    const unionMeta = na['x-tf-union'];
    if (ua && ub && unionMeta && !unionMeta.merge) {
      return { ...na, oneOf: undefined, anyOf: [...ua, ...ub] };
    }
    if (na.type === 'array' && nb.type === 'array' && na.items && nb.items) {
      return { ...na, items: this.mergeTwo(na.items, nb.items, `${name}[]`, mode) };
    }
    if (na.properties && nb.properties) return this.mergeObjects(na, nb, mode);
    if (this.isPrimitive(na) && this.isPrimitive(nb) && this.primType(na) === this.primType(nb)) {
      return na;
    }
    if (mode === 'all') throw new Error(`allOf parts disagree on property ${name}`);
    // `compile` records it at its location.
    return { 'x-tf-json-leaf': true, implicitLeaf: true, leafOf: [a, b] };
  }

  isPrimitive(s: OasSchema): boolean {
    const n = this.resolve(s);
    const br = this.unionBranches(n);
    if (br) return br.every((b) => this.isPrimitive(b));
    return (
      ['string', 'number', 'integer', 'boolean'].includes(n.type ?? '') ||
      (!!n.enum && !n.properties)
    );
  }

  primType(s: OasSchema): 'string' | 'number' | 'bool' {
    const n = this.resolve(s);
    const br = this.unionBranches(n);
    if (br) {
      const ts = [...new Set(br.map((b) => this.primType(b)))];
      return ts.length === 1 ? ts[0] : 'string';
    }
    if (n.type === 'boolean') return 'bool';
    if (n.type === 'number' || n.type === 'integer') return 'number';
    return 'string';
  }

  /**
   * Apply `json_leaves` (`a`, `a[]`, `a[].b`) to each schema. A path may be absent from some of them (merged
   * variants differ), but a path that matches none of them is a mapping mistake.
   */
  applyJsonLeaves(
    schemas: OasSchema[],
    leaves: Readonly<Record<string, string>> | undefined,
    where: string
  ): OasSchema[] {
    if (!leaves) return schemas;
    let out = schemas;
    for (const [path, name] of Object.entries(leaves)) {
      const hits = { count: 0 };
      out = out.map((s) => this.markLeaf(s, path.split('.'), name, hits));
      if (!hits.count)
        throw new Error(`json_leaves path "${path}" matches no property in ${where}`);
    }
    return out;
  }

  private markLeaf(
    obj: OasSchema,
    segs: string[],
    name: string,
    hits: { count: number }
  ): OasSchema {
    const s = this.normalize(obj);
    const [seg, ...rest] = segs;
    const isItems = seg.endsWith('[]');
    const prop = isItems ? seg.slice(0, -2) : seg;
    const target = s.properties?.[prop];
    if (!target) return s; // not present in this variant
    let child: OasSchema;
    if (isItems) {
      const arr = this.resolve(target);
      if (!arr.items) return s;
      if (!rest.length) hits.count++;
      const items = rest.length
        ? this.markLeaf(arr.items, rest, name, hits)
        : { ...arr.items, 'x-tf-json-leaf': { attribute: name } };
      child = { ...arr, items };
    } else {
      if (!rest.length) hits.count++;
      child = rest.length
        ? this.markLeaf(target, rest, name, hits)
        : { ...target, 'x-tf-json-leaf': true, jsonName: name };
    }
    return { ...s, properties: { ...s.properties, [prop]: child } };
  }

  discValues(branch: OasSchema, disc: string): string[] {
    const sub = this.unionBranches(branch);
    if (sub && !branch.properties) {
      return [...new Set(sub.flatMap((b) => this.discValues(this.normalize(b), disc)))];
    }
    const p = branch.properties?.[disc];
    if (!p) return [];
    const collect = (n: OasSchema): string[] => {
      const r = this.resolve(n);
      const br = this.unionBranches(r);
      if (br) return br.flatMap(collect);
      return (r.enum ?? []).map(String);
    };
    return collect(p);
  }

  compile(
    raw: OasSchema,
    override?: Partial<TfUnionMeta>,
    stack: string[] = [],
    location = ''
  ): TNode {
    const name = refName(raw);
    if (name && stack.includes(name)) return this.jsonNode(raw);
    const nextStack = name ? [...stack, name] : stack;
    const at = name ?? location;
    const s = this.normalize(raw);
    const leaf = s['x-tf-json-leaf'];
    if (leaf) {
      if (s.implicitLeaf) this.implicitJsonLeaves.add(at);
      return this.jsonNode(s, typeof leaf === 'object' ? leaf.attribute : undefined);
    }

    const branches = this.unionBranches(s);
    const unionMeta = s['x-tf-union'];
    if (override && !(branches && unionMeta) && s.type !== 'array') {
      throw new Error(
        `x-tf-union-override on ${s.title ?? name ?? 'a schema'} that is not a mapped union`
      );
    }
    if (branches) {
      if (branches.every((b) => this.isPrimitive(b))) return { k: 'prim', type: this.primType(s) };
      if (!unionMeta) {
        // Convention: unmapped union of objects -> JSON leaf.
        this.implicitJsonLeaves.add(at);
        return this.jsonNode(s);
      }
      const m: TfUnionMeta = { ...unionMeta, ...override };
      if (m.merge) {
        const parts = this.applyJsonLeaves(
          branches.map((b) => this.normalize(b)),
          m.json_leaves,
          s.title ?? 'a merged union'
        );
        const merged = parts.reduce((acc, b) => this.mergeObjects(acc, b, 'any'));
        const { dropProperty } = s;
        if (dropProperty && !merged['x-tf-variant']?.keep_discriminator) {
          const { [dropProperty]: _dropped, ...kept } = merged.properties ?? {};
          merged.properties = kept;
        }
        return this.compile(merged, undefined, nextStack, at);
      }
      return this.compileKeyed(branches, m, nextStack, at);
    }
    const ref = s['x-tf-ref'];
    if (s.type === 'array') {
      if (!s.items) return { k: 'json' };
      const items = this.compile(s.items, s['x-tf-union-override'], nextStack, `${at}[]`);
      return { k: 'list', items: ref ? this.withRef(items, ref, at) : items };
    }
    if (s.properties) {
      const props: Prop[] = [];
      for (const [propName, pr] of Object.entries(s.properties)) {
        const p = this.resolve(pr);
        if (p['x-tf-omit']) continue;
        const propAt = `${at}.${propName}`;
        const unwrap = p['x-tf-unwrap'] ? this.unwrapProperty(p, propAt) : undefined;
        const [unwrapName, unwrapSchema] = unwrap ?? [];
        // Arrays read their own override in the branch above.
        const node = this.compile(
          unwrapSchema ?? pr,
          unwrap || p.type === 'array' ? undefined : p['x-tf-union-override'],
          nextStack,
          unwrap ? `${propAt}.${unwrapName}` : propAt
        );
        const isPropLeaf = node.k === 'json' && !node.attribute;
        props.push({
          apiName: propName,
          tfName: isPropLeaf ? p.jsonName ?? `${propName}_json` : propName,
          node,
          required: (s.required ?? []).includes(propName),
          flatten: !!p['x-tf-flatten'],
          ...(unwrapName !== undefined && { unwrap: unwrapName }),
        });
      }
      return { k: 'object', props };
    }
    if (s.type === 'object') return { k: 'json' }; // free-form object
    const prim: TNode = { k: 'prim', type: this.primType(s) };
    return ref ? this.withRef(prim, ref, at) : prim;
  }

  /** The single, required property an `x-tf-unwrap` object holds; anything else is a mapping mistake. */
  private unwrapProperty(raw: OasSchema, location: string): [string, OasSchema] {
    const { properties = {}, required = [], 'x-tf-flatten': flatten } = this.normalize(raw);
    const [entry, ...others] = Object.entries(properties);
    if (!entry || others.length || !required.includes(entry[0]) || flatten) {
      throw new Error(
        `x-tf-unwrap at ${location} is not on an unflattened object with one required property`
      );
    }
    return entry;
  }

  /** A value kept as a JSON string, with where references sit inside it. */
  jsonNode(raw: OasSchema, attribute?: string): TNode {
    const refs = this.refFinder(raw);
    return {
      k: 'json',
      ...(attribute !== undefined && { attribute }),
      ...(refs && { refs }),
    };
  }

  /** A string that holds the ID of another resource; a reference anywhere else is a mapping mistake. */
  withRef(node: TNode, ref: TfRefMeta, location: string): TNode {
    if (node.k !== 'prim' || node.type !== 'string') {
      throw new Error(`x-tf-ref at ${location} is not on a string or a list of strings`);
    }
    return { ...node, ref };
  }

  /** The component a union branch comes from (also through `allOf` distribution), else its place in the union. */
  branchLocation(branch: OasSchema, fallback: string): string {
    const name = refName(branch);
    if (name) return name;
    const [first] = branch.allOf ?? [];
    return first ? this.branchLocation(first, fallback) : fallback;
  }

  compileKeyed(branches: OasSchema[], m: TfUnionMeta, stack: string[], location = ''): KeyedNode {
    const disc = m.structural ? undefined : m.discriminator;
    const discOutside = m.discriminator_placement === 'outside';
    const byKey = new Map<
      string,
      Pick<Variant, 'values' | 'match' | 'keepDiscriminator'> & {
        raws: OasSchema[];
        location: string;
      }
    >();
    let outsideRaw: OasSchema | undefined;
    let outsideLocation = location;
    for (const b of branches) {
      const nb = this.normalize(b);
      const v = nb['x-tf-variant'] ?? {};
      if (v.omit) continue;
      const values = disc ? this.discValues(nb, disc) : [];
      const key: string =
        v.key ??
        m.variant_keys?.[values[0]] ??
        (m.key_template ?? '{value}').replace('{value}', values[0]);
      if (!key || key.includes('undefined'))
        throw new Error(`no variant key for branch ${nb.title}`);
      const branchAt = this.branchLocation(b, `${location}|${key}`);
      const { [disc ?? '']: _d, ...restProps } = nb.properties ?? {};
      let content: OasSchema;
      if (m.content) {
        const { [m.content]: body, ...outsideProps } = restProps;
        if (!body)
          throw new Error(`content property "${m.content}" missing from branch ${nb.title}`);
        content = body;
        // Every branch contributes its own outside properties; ones only some branches have become optional.
        const outside: OasSchema = {
          type: 'object',
          properties: outsideProps,
          required: nb.required ?? [],
        };
        if (!outsideRaw) outsideLocation = branchAt;
        outsideRaw = outsideRaw ? this.mergeObjects(outsideRaw, outside, 'any') : outside;
      } else if (this.unionBranches(nb) && !nb.properties) {
        // The branch is itself a (merged) union: drop the discriminator after merging.
        content = disc && !v.keep_discriminator ? { ...nb, dropProperty: disc } : nb;
      } else {
        content = { ...nb, properties: v.keep_discriminator ? nb.properties : restProps };
      }
      const [withLeaves] = this.applyJsonLeaves([content], v.json_leaves, nb.title ?? key);
      const entry = byKey.get(key) ?? {
        raws: [],
        values: [],
        location: m.content ? `${branchAt}.${m.content}` : branchAt,
        match: v.match,
        keepDiscriminator: !!v.keep_discriminator,
      };
      entry.raws.push(withLeaves);
      entry.values.push(...values);
      byKey.set(key, entry);
    }
    const variants: Variant[] = [...byKey.entries()].map(
      ([key, { raws, values, location: variantAt, match, keepDiscriminator }]) => {
        const raw =
          raws.length > 1
            ? raws.map((r) => this.normalize(r)).reduce((a, b) => this.mergeObjects(a, b, 'any'))
            : raws[0];
        const jsonRefs = m.extra_json_variant && this.refFinder(raw);
        return {
          key,
          values: [...new Set(values)],
          content: this.compile(raw, undefined, stack, variantAt),
          match,
          keepDiscriminator,
          ...(jsonRefs && { jsonRefs }),
        };
      }
    );
    const outsideNode = outsideRaw
      ? this.compile(outsideRaw, undefined, stack, outsideLocation)
      : undefined;
    return {
      k: 'keyed',
      m,
      disc,
      discOutside,
      outside: outsideNode?.k === 'object' ? outsideNode.props : [],
      variants,
    };
  }
}

/**
 * Compiles the dashboard root of an OpenAPI document into the model. Sections are split out of `panels[]` into a root
 * `sections[]`, which is how the provider models them.
 */
export const compileDashboardRoot = (doc: OasDocument): { compiler: Compiler; root: TNode } => {
  const compiler = new Compiler(doc);
  const rootSchema = compiler.normalize({ $ref: `#/components/schemas/${ROOT_COMPONENT}` });
  const { panels: panelsRaw, ...otherProperties } = rootSchema.properties ?? {};
  const panelItems = panelsRaw?.items && compiler.unionBranches(compiler.resolve(panelsRaw.items));
  const panelUnionRaw = panelItems?.find(
    ({ $ref }) => $ref !== `#/components/schemas/${SECTION_COMPONENT}`
  );
  if (!panelUnionRaw) throw new Error('The dashboard root has no panel union in panels[]');
  // The panel-or-section union is split here rather than compiled.
  const root = compiler.compile(
    { ...rootSchema, properties: otherProperties },
    undefined,
    [ROOT_COMPONENT],
    ROOT_COMPONENT
  );
  if (root.k !== 'object') throw new Error('The dashboard root is not an object');
  root.props.push(
    {
      apiName: 'panels',
      tfName: 'panels',
      required: false,
      node: {
        k: 'list',
        items: compiler.compile(panelUnionRaw, undefined, [], `${ROOT_COMPONENT}.panels[]`),
      },
    },
    {
      apiName: 'sections',
      tfName: 'sections',
      required: false,
      node: compiler.compile({
        type: 'array',
        items: { $ref: `#/components/schemas/${SECTION_COMPONENT}` },
      }),
    }
  );
  return { compiler, root };
};
