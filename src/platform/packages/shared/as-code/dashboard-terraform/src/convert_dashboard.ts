/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonObject, JsonValue } from '@kbn/utility-types';
import type {
  JsonStringPanel,
  LinkedResource,
  PanelSummary,
  SkippedPanel,
} from './conversion_schemas';
import type { KeyedNode, OasDocument, RefFinder, TNode, Variant } from './oas_model';
import { compileDashboardRoot } from './oas_model';
import { toResourceName } from './resource_name';

export interface PartialPanel extends PanelSummary {
  /** API paths of the panel's fields the resource has no attribute for. */
  droppedFields: string[];
}

/** A Terraform body location: object keys and list indexes. */
export type TerraformPath = Array<string | number>;

/** An ID in the body that the mapping (`x-tf-ref`) says belongs to a resource of another type. */
export interface Reference {
  path: TerraformPath;
  /** Set when `path` is a JSON string: where the ID sits inside the JSON value it holds. */
  jsonPath?: TerraformPath;
  resourceType: string;
  /** The attribute of that resource holding the ID. */
  idAttribute: string;
  /** The ID as the API holds it (the body holds it escaped). */
  id: string;
}

export interface DashboardConversion {
  /** The body of the `elasticstack_kibana_dashboard` resource, in Terraform JSON syntax. */
  body: JsonObject;
  /** API paths of the fields the resource has no attribute for. */
  droppedFields: string[];
  /** Panels that could not be converted and are left out of `body`. */
  skippedPanels: SkippedPanel[];
  /** Converted panels that lost fields, so they must not read as fully typed; also in `droppedFields`. */
  partialPanels: PartialPanel[];
  /** Panels exported whole as a JSON string because they could not be converted to typed attributes. */
  jsonPanels: JsonStringPanel[];
  /** IDs in `body` that point at resources of other types, still as literal IDs. */
  references: Reference[];
  /**
   * IDs in `references` that also occur in `body` where no reference reaches (for example the deprecated Lens
   * by-value `references`). Linking only the reachable ones would half-link the dashboard, so they stay literal.
   */
  unlinkableIds: string[];
}

/** The dashboard itself (not one of its panels) cannot be converted. */
export class DashboardConversionError extends Error {}

export type DashboardConverter = (dashboard: JsonObject) => DashboardConversion;

const isObject = (value: JsonValue | undefined): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const preview = (value: JsonValue) => JSON.stringify(value).slice(0, 120);

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

const expectObject = (value: JsonValue, path: string): JsonObject => {
  if (!isObject(value)) throw new Error(`${path}: expected an object, got ${preview(value)}`);
  return value;
};

const stringAt = (value: JsonValue | undefined, key: string): string | undefined => {
  const child = isObject(value) ? value[key] : undefined;
  return typeof child === 'string' ? child : undefined;
};

const summarize = (panel: JsonValue, path: string): PanelSummary => {
  const type = stringAt(panel, 'type');
  const title = stringAt(isObject(panel) ? panel.config : undefined, 'title');
  return { path, ...(type !== undefined && { type }), ...(title !== undefined && { title }) };
};

const childPath = (path: string, key: string) => (path ? `${path}.${key}` : key);

const recognize = (node: KeyedNode, value: JsonObject, path: string): Variant | undefined => {
  if (node.m.structural) {
    return node.variants.find(({ match }) =>
      !match ? false : 'present' in match ? match.present in value : !(match.absent in value)
    );
  }
  const discriminatorValue = value[node.disc ?? ''] ?? node.m.default_value;
  if (typeof discriminatorValue !== 'string') return undefined;
  return node.variants.find(({ values }) => values.includes(discriminatorValue));
};

// What a conversion lost, which values it wrote under their union's extra JSON-string variant key (and why), the
// IDs it found that point at other resources, and how often each string value it wrote occurs (JSON strings
// included), so an ID that also occurs where no reference reaches can be told apart.
interface ConversionLog {
  dropped: string[];
  jsonVariants: Array<{ path: string; reason: string }>;
  references: Reference[];
  strings: Map<string, number>;
}

const emptyLog = (): ConversionLog => ({
  dropped: [],
  jsonVariants: [],
  references: [],
  strings: new Map(),
});

const increment = (counts: Map<string, number>, key: string, by = 1) =>
  counts.set(key, (counts.get(key) ?? 0) + by);

const mergeLog = (into: ConversionLog, from: ConversionLog) => {
  into.dropped.push(...from.dropped);
  into.jsonVariants.push(...from.jsonVariants);
  into.references.push(...from.references);
  for (const [text, count] of from.strings) increment(into.strings, text, count);
};

const countStrings = (value: JsonValue, strings: Map<string, number>): void => {
  if (typeof value === 'string') increment(strings, value);
  else if (Array.isArray(value)) value.forEach((item) => countStrings(item, strings));
  else if (isObject(value)) Object.values(value).forEach((item) => countStrings(item, strings));
};

// The references `finder` locates in a value written as a JSON string at `leafPath`; a place several union branches
// share is reported once.
const leafReferences = (
  finder: RefFinder | undefined,
  value: JsonValue,
  leafPath: TerraformPath
): Reference[] => {
  const found = new Map<string, Reference>();
  const visit = (
    node: RefFinder | undefined,
    current: JsonValue | undefined,
    jsonPath: TerraformPath
  ) => {
    if (!node || current === undefined) return;
    switch (node.k) {
      case 'ref':
        if (typeof current === 'string') {
          const { resource_type: resourceType, id_attribute: idAttribute } = node.ref;
          found.set(JSON.stringify(jsonPath), {
            path: leafPath,
            jsonPath,
            resourceType,
            idAttribute,
            id: current,
          });
        }
        return;
      case 'object': {
        if (!isObject(current)) return;
        const { consts, props } = node;
        const otherBranch = Object.entries(consts).some(
          ([key, constant]) => key in current && current[key] !== constant
        );
        if (otherBranch) return;
        for (const [key, child] of Object.entries(props)) {
          visit(child, current[key], [...jsonPath, key]);
        }
        return;
      }
      case 'list':
        if (Array.isArray(current)) {
          current.forEach((item, i) => visit(node.items, item, [...jsonPath, i]));
        }
        return;
      case 'map':
        if (isObject(current)) {
          for (const [key, item] of Object.entries(current)) {
            visit(node.values, item, [...jsonPath, key]);
          }
        }
        return;
      case 'any':
        node.branches.forEach((branch) => visit(branch, current, jsonPath));
        return;
      case 'lazy':
        visit(node.get(), current, jsonPath);
    }
  };
  visit(finder, value, []);
  return [...found.values()];
};

// A value written as a JSON string at `leafPath`: its strings are counted and its references reported.
const writeJson = (
  value: JsonValue,
  finder: RefFinder | undefined,
  leafPath: TerraformPath,
  log: ConversionLog
): string => {
  countStrings(value, log.strings);
  log.references.push(...leafReferences(finder, value, leafPath));
  return JSON.stringify(value);
};

// `path` is the API path reports name; `tfPath` is where the value lands in the Terraform body.
const convertValue = (
  node: TNode,
  value: JsonValue,
  path: string,
  tfPath: TerraformPath,
  log: ConversionLog
): JsonValue => {
  switch (node.k) {
    case 'prim':
      countStrings(value, log.strings);
      if (node.ref && typeof value === 'string') {
        const { resource_type: resourceType, id_attribute: idAttribute } = node.ref;
        log.references.push({ path: tfPath, resourceType, idAttribute, id: value });
      }
      return value;
    case 'json':
      return node.attribute
        ? { [node.attribute]: writeJson(value, node.refs, [...tfPath, node.attribute], log) }
        : writeJson(value, node.refs, tfPath, log);
    case 'list':
      if (!Array.isArray(value)) throw new Error(`${path}: expected a list, got ${preview(value)}`);
      return value.map((item, i) =>
        convertValue(node.items, item, `${path}[${i}]`, [...tfPath, i], log)
      );
    case 'object': {
      const out: JsonObject = {};
      for (const [key, child] of Object.entries(expectObject(value, path))) {
        const prop = node.props.find(({ apiName }) => apiName === key);
        if (!prop) {
          log.dropped.push(childPath(path, key));
          continue;
        }
        const [apiValue, apiPath] = prop.unwrap
          ? unwrapValue(prop.unwrap, child, childPath(path, key), log)
          : [child, childPath(path, key)];
        const converted = convertValue(
          prop.node,
          apiValue,
          apiPath,
          prop.flatten ? tfPath : [...tfPath, prop.tfName],
          log
        );
        if (prop.flatten && isObject(converted)) Object.assign(out, converted);
        else out[prop.tfName] = converted;
      }
      return out;
    }
    case 'keyed':
      return convertKeyed(node, value, path, tfPath, log);
  }
};

// The value of the API's one-property object, and its path; any other property is dropped.
const unwrapValue = (
  property: string,
  apiValue: JsonValue,
  path: string,
  log: ConversionLog
): [JsonValue, string] => {
  const { [property]: value, ...rest } = expectObject(apiValue, path);
  if (value === undefined) throw new Error(`${path}: expected ${property}`);
  for (const key of Object.keys(rest)) log.dropped.push(childPath(path, key));
  return [value, childPath(path, property)];
};

const convertKeyed = (
  node: KeyedNode,
  apiValue: JsonValue,
  path: string,
  tfPath: TerraformPath,
  log: ConversionLog
): JsonObject => {
  const value = expectObject(apiValue, path);
  const { m, disc, discOutside, outside } = node;
  const out: JsonObject = {};
  const rest: JsonObject = { ...value };
  for (const prop of outside) {
    const child = value[prop.apiName];
    if (child !== undefined) {
      out[prop.tfName] = convertValue(
        prop.node,
        child,
        childPath(path, prop.apiName),
        [...tfPath, prop.tfName],
        log
      );
    }
    delete rest[prop.apiName];
  }
  const variant = recognize(node, value, path);
  if (disc && discOutside && value[disc] !== undefined) {
    out[disc] = value[disc];
    countStrings(value[disc], log.strings);
  }
  if (disc && !variant?.keepDiscriminator) delete rest[disc];

  const contentPath = m.content ? childPath(path, m.content) : path;
  let content: JsonValue = rest;
  if (m.content) {
    content = value[m.content] ?? {};
    for (const key of Object.keys(rest)) {
      if (key !== m.content) log.dropped.push(childPath(path, key));
    }
  }

  const discriminatorValue = disc ? value[disc] : undefined;
  const jsonKey =
    typeof discriminatorValue === 'string' &&
    m.extra_json_variant?.values.includes(discriminatorValue)
      ? m.extra_json_variant.key
      : undefined;
  const asJson = (key: string, reason: string): JsonObject => {
    out[key] = writeJson(content, variant?.jsonRefs, [...tfPath, key], log);
    log.jsonVariants.push({ path, reason });
    return out;
  };

  if (!variant) {
    const reason = `${path}: no Terraform variant for ${preview(value)}`;
    if (jsonKey) return asJson(jsonKey, reason);
    throw new Error(reason);
  }
  if (!jsonKey || !isObject(content)) {
    out[variant.key] = convertValue(
      variant.content,
      content,
      contentPath,
      [...tfPath, variant.key],
      log
    );
    return out;
  }
  // The JSON-string variant keeps every field, so a typed conversion that fails falls back to it.
  const attempt = emptyLog();
  try {
    out[variant.key] = convertValue(
      variant.content,
      content,
      contentPath,
      [...tfPath, variant.key],
      attempt
    );
  } catch (e) {
    return asJson(jsonKey, messageOf(e));
  }
  mergeLog(log, attempt);
  return out;
};

// Strings in Terraform JSON syntax are templates: `${` and `%{` start an interpolation or a directive, `$${` and
// `%%{` are their literal forms. Replacer functions, because `$$` in a replacement string is a single `$`.
const escapeTemplate = (text: string): string =>
  text.replace(/\$\{/g, () => '$${').replace(/%\{/g, () => '%%{');

const escapeStrings = (value: JsonValue): JsonValue => {
  if (typeof value === 'string') return escapeTemplate(value);
  if (Array.isArray(value)) return value.map(escapeStrings);
  return isObject(value) ? escapeObject(value) : value;
};

const escapeObject = (value: JsonObject): JsonObject =>
  Object.fromEntries(Object.entries(value).map(([key, v]) => [key, escapeStrings(v)]));

const listItems = (node: TNode | undefined, what: string): TNode => {
  if (node?.k !== 'list') throw new Error(`The dashboard model has no list of ${what}`);
  return node.items;
};

const propNode = (node: TNode, name: string): TNode | undefined =>
  node.k === 'object' ? node.props.find(({ apiName }) => apiName === name)?.node : undefined;

/** Compiles the dashboard schemas once; the converter skips and reports each panel it cannot convert. */
export const createDashboardConverter = (doc: OasDocument): DashboardConverter => {
  const { root } = compileDashboardRoot(doc);
  const panelNode = listItems(propNode(root, 'panels'), 'panels');
  const pinnedPanelNode = listItems(propNode(root, 'pinned_panels'), 'pinned panels');
  const sectionNode = listItems(propNode(root, 'sections'), 'sections');
  const sectionPanelNode = listItems(propNode(sectionNode, 'panels'), 'section panels');

  return (dashboard) => {
    // What the body holds: the logs of the parts that were converted, not of the panels skipped.
    const kept = emptyLog();
    const skippedPanels: SkippedPanel[] = [];
    const partialPanels: PartialPanel[] = [];
    const jsonPanels: JsonStringPanel[] = [];
    const { panels = [], pinned_panels: pinnedPanels = [], ...envelope } = dashboard;

    const convertPanel = (
      node: TNode,
      panel: JsonValue,
      path: string,
      tfPath: TerraformPath
    ): JsonValue[] => {
      const log = emptyLog();
      try {
        const converted = convertValue(node, panel, path, tfPath, log);
        mergeLog(kept, log);
        if (log.dropped.length) {
          partialPanels.push({ ...summarize(panel, path), droppedFields: log.dropped });
        }
        const asJson = log.jsonVariants.find((variant) => variant.path === path);
        if (asJson) jsonPanels.push({ ...summarize(panel, path), reason: asJson.reason });
        return [converted];
      } catch (e) {
        skippedPanels.push({ ...summarize(panel, path), reason: messageOf(e) });
        return [];
      }
    };
    // Skipped panels leave no gap, so a panel's index in the body is the count converted before it.
    const convertPanels = (
      node: TNode,
      list: JsonValue,
      path: string,
      tfPath: TerraformPath
    ): JsonValue[] => {
      if (!Array.isArray(list)) throw new DashboardConversionError(`${path}: expected a list`);
      const converted: JsonValue[] = [];
      list.forEach((panel, i) => {
        converted.push(
          ...convertPanel(node, panel, `${path}[${i}]`, [...tfPath, converted.length])
        );
      });
      return converted;
    };

    // Outside panels, a value the resource cannot hold fails the whole dashboard.
    const convertPart = (
      node: TNode,
      value: JsonObject,
      path: string,
      tfPath: TerraformPath
    ): JsonObject => {
      const log = emptyLog();
      try {
        const converted = expectObject(convertValue(node, value, path, tfPath, log), path);
        mergeLog(kept, log);
        return converted;
      } catch (e) {
        throw new DashboardConversionError(messageOf(e));
      }
    };

    const body = convertPart(root, envelope, '', []);
    if (!Array.isArray(panels)) throw new DashboardConversionError('panels: expected a list');

    // Sections are a documented special case: the API interleaves them with panels, the resource keeps two lists.
    const tfPanels: JsonValue[] = [];
    const tfSections: JsonValue[] = [];
    panels.forEach((item, i) => {
      const path = `panels[${i}]`;
      if (!isObject(item) || 'type' in item || !Array.isArray(item.panels)) {
        tfPanels.push(...convertPanel(panelNode, item, path, ['panels', tfPanels.length]));
        return;
      }
      const { panels: sectionPanels, ...section } = item;
      const sectionPath = ['sections', tfSections.length];
      const tfSection = convertPart(sectionNode, section, path, sectionPath);
      const converted = convertPanels(sectionPanelNode, sectionPanels, `${path}.panels`, [
        ...sectionPath,
        'panels',
      ]);
      tfSections.push(converted.length ? { ...tfSection, panels: converted } : tfSection);
    });
    const tfPinnedPanels = convertPanels(pinnedPanelNode, pinnedPanels, 'pinned_panels', [
      'pinned_panels',
    ]);

    if (tfPanels.length) body.panels = tfPanels;
    if (tfSections.length) body.sections = tfSections;
    if (tfPinnedPanels.length) body.pinned_panels = tfPinnedPanels;

    const { dropped: droppedFields, references, strings } = kept;
    const referenceCounts = new Map<string, number>();
    for (const { id } of references) increment(referenceCounts, id);
    const unlinkableIds = [...referenceCounts]
      .filter(([id, count]) => (strings.get(id) ?? 0) > count)
      .map(([id]) => id);

    // Everything in the body is user content; references generated later must not go through this.
    return {
      body: escapeObject(body),
      droppedFields,
      skippedPanels,
      partialPanels,
      jsonPanels,
      references,
      unlinkableIds,
    };
  };
};

/** An object a reference may point at, as the API holds it (its text is escaped when written). */
export interface ReferencedObject {
  resourceType: string;
  id: string;
  /** The name the user knows it by, which names its resource (a data view's name, else its title). */
  name?: string;
  /** The body of its resource, e.g. a tag's `name`, `color` and `description`. */
  attributes: JsonObject;
}

/** A resource written for a referenced object; it pins no ID, so applying it as written creates a new object. */
export interface LinkedConversion {
  body: JsonObject;
  resources: LinkedResource[];
}

const updateAt = (
  value: JsonValue,
  [step, ...rest]: TerraformPath,
  update: (current: JsonValue) => JsonValue
): JsonValue => {
  if (step === undefined) return update(value);
  if (Array.isArray(value) && typeof step === 'number' && step < value.length) {
    return value.map((item, i) => (i === step ? updateAt(item, rest, update) : item));
  }
  if (isObject(value) && typeof step === 'string' && step in value) {
    return { ...value, [step]: updateAt(value[step], rest, update) };
  }
  throw new Error(`No value at ${JSON.stringify([step, ...rest])}`);
};

// The body's JSON strings are escaped as a whole, which leaves them valid JSON whose strings are escaped, so the
// reference is set in the parsed value and the rest of the string stays as it was.
const linkAt = (body: JsonValue, { path, jsonPath }: Reference, link: string): JsonValue =>
  updateAt(body, path, (current) => {
    if (!jsonPath) return link;
    if (typeof current !== 'string') throw new Error(`No JSON string at ${JSON.stringify(path)}`);
    return JSON.stringify(updateAt(JSON.parse(current), jsonPath, () => link));
  });

/**
 * Writes a resource per given object and points references at it unescaped, inside JSON strings too. References to
 * other objects, and to objects that also occur where no reference reaches, stay literal IDs.
 */
export const linkReferences = (
  {
    body,
    references,
    unlinkableIds,
  }: Pick<DashboardConversion, 'body' | 'references' | 'unlinkableIds'>,
  objects: readonly ReferencedObject[]
): LinkedConversion => {
  const resources: LinkedResource[] = [];
  const taken = new Set<string>();
  const uniqueName = (type: string, base: string): string => {
    let name = base;
    for (let n = 2; taken.has(`${type}.${name}`); n++) name = `${base}_${n}`;
    taken.add(`${type}.${name}`);
    return name;
  };
  const unlinkable = new Set(unlinkableIds);
  let linked: JsonValue = body;
  for (const reference of references) {
    const { resourceType, idAttribute, id } = reference;
    if (unlinkable.has(id)) continue;
    let resource = resources.find((r) => r.type === resourceType && r.id === id);
    if (!resource) {
      const object = objects.find((o) => o.resourceType === resourceType && o.id === id);
      if (!object) continue;
      // `elasticstack_kibana_data_view` → `data_view` names a resource whose own name yields no identifier.
      const fallback = resourceType.replace(/^elasticstack_kibana_/, '');
      resource = {
        type: resourceType,
        name: uniqueName(resourceType, toResourceName(object.name ?? '', fallback)),
        id,
        label: object.name || id,
        body: escapeObject(object.attributes),
      };
      resources.push(resource);
    }
    linked = linkAt(linked, reference, `\${${resourceType}.${resource.name}.${idAttribute}}`);
  }
  return { body: expectObject(linked, 'body'), resources };
};
