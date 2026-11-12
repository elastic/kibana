/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DefinitionNode,
  DocumentNode,
  GraphQLNamedType,
  GraphQLSchema,
  IntrospectionQuery,
} from 'graphql';
import {
  BreakingChangeType,
  buildClientSchema,
  buildSchema,
  DangerousChangeType,
  DirectiveLocation,
  findSchemaChanges,
  getNamedType,
  isEnumType,
  isInputObjectType,
  isAbstractType,
  isInterfaceType,
  isObjectType,
  isSpecifiedDirective,
  isSpecifiedScalarType,
  isUnionType,
  Kind,
  lexicographicSortSchema,
  parse,
  print,
  printSchema,
  visit,
} from 'graphql';
import { differenceWith, isEqual } from 'lodash';
import type { GraphQLSpec, McpSpec, McpTool } from '@kbn/connector-emulate';
import type { SpecChange } from './detect_drift';
import { isJsonObject } from './json_pointer';
import type { ProtocolFormat } from './manifest';
import { parseSpecText } from './parse_spec_text';
import { toStableJson } from './stable_json';

export type ProtocolSpec = GraphQLSpec | McpSpec;

const ROOT_OPERATIONS = ['query', 'mutation', 'subscription'] as const;
type RootOperation = (typeof ROOT_OPERATIONS)[number];

const rootTypeOf = (schema: GraphQLSchema, operation: RootOperation) =>
  operation === 'query'
    ? schema.getQueryType()
    : operation === 'mutation'
    ? schema.getMutationType()
    : schema.getSubscriptionType();

// Vendor schemas apply directives they don't always define; only `@deprecated` matters here.
const normalizeSdl = (sdl: string): string =>
  printSchema(lexicographicSortSchema(buildSchema(sdl, { assumeValidSDL: true })));

const introspectionToSdl = (text: string): string => {
  const parsed: unknown = JSON.parse(text);
  const data = isJsonObject(parsed) && isJsonObject(parsed.data) ? parsed.data : parsed;
  if (!isJsonObject(data) || !isJsonObject(data.__schema)) {
    throw new Error('The GraphQL source is JSON, but not an introspection result');
  }
  return printSchema(buildClientSchema(data as unknown as IntrospectionQuery));
};

const readTools = (text: string): McpTool[] => {
  const parsed = parseSpecText(text);
  const holder = isJsonObject(parsed) && isJsonObject(parsed.result) ? parsed.result : parsed;
  const tools = isJsonObject(holder) ? holder.tools : undefined;
  if (
    !Array.isArray(tools) ||
    !tools.every(
      (tool) =>
        isJsonObject(tool) && typeof tool.name === 'string' && isJsonObject(tool.inputSchema)
    )
  ) {
    throw new Error(
      'The MCP source is not a tools/list result: { tools: [{ name, inputSchema }] }'
    );
  }
  return tools as unknown as McpTool[];
};

/**
 * Reads a GraphQL or MCP spec from what its source URL serves: SDL or an introspection result, or a
 * `tools/list` result. The URL is only read, so servers that need a request of their own, or
 * credentials, are captured once and served from a file.
 */
export const loadProtocolSpec = async (
  url: string,
  fetchText: (url: string) => Promise<string>,
  format: ProtocolFormat,
  endpoints: readonly string[]
): Promise<ProtocolSpec> => {
  const text = await fetchText(url);
  if (format === 'mcp') {
    return { format, tools: readTools(text), endpoints };
  }
  const sdl = text.trimStart().startsWith('{') ? introspectionToSdl(text) : text;
  return { format, sdl: normalizeSdl(sdl), endpoints };
};

/** The spec a committed snapshot holds. */
export const parseProtocolSnapshot = (
  format: ProtocolFormat,
  snapshot: string,
  endpoints: readonly string[]
): ProtocolSpec =>
  format === 'mcp'
    ? { format, tools: readTools(snapshot), endpoints }
    : { format, sdl: snapshot, endpoints };

// The types a type's values and arguments can have; implemented interfaces aren't among them.
const referencedTypesOf = (type: GraphQLNamedType): GraphQLNamedType[] => {
  if (isUnionType(type)) {
    return [...type.getTypes()];
  }
  if (isInputObjectType(type)) {
    return Object.values(type.getFields()).map((field) => getNamedType(field.type));
  }
  if (isObjectType(type) || isInterfaceType(type)) {
    return Object.values(type.getFields()).flatMap((field) => [
      getNamedType(field.type),
      ...field.args.map((arg) => getNamedType(arg.type)),
    ]);
  }
  return [];
};

// Where operations can apply a directive; a request using one fails if the snapshot lacks it.
const EXECUTABLE_DIRECTIVE_LOCATIONS = new Set<string>([
  DirectiveLocation.QUERY,
  DirectiveLocation.MUTATION,
  DirectiveLocation.SUBSCRIPTION,
  DirectiveLocation.FIELD,
  DirectiveLocation.FRAGMENT_DEFINITION,
  DirectiveLocation.FRAGMENT_SPREAD,
  DirectiveLocation.INLINE_FRAGMENT,
  DirectiveLocation.VARIABLE_DEFINITION,
]);

// The root fields to keep, by root type name. A schema needs a query root to be valid, so when no
// action queries, the first query field stays.
const keptRootFields = (schema: GraphQLSchema, names: readonly string[]) => {
  const kept = new Map<string, Set<string>>();
  for (const name of names) {
    const [operation, field] = name.split(' ') as [RootOperation, string];
    const root = rootTypeOf(schema, operation);
    if (root?.getFields()[field]) {
      kept.set(root.name, (kept.get(root.name) ?? new Set()).add(field));
    }
  }
  const query = schema.getQueryType();
  if (query && !kept.has(query.name)) {
    const [first] = Object.keys(query.getFields());
    kept.set(query.name, new Set(first === undefined ? [] : [first]));
  }
  return kept;
};

const withoutDescriptions = (document: DocumentNode): DocumentNode =>
  visit(document, {
    enter: (node) =>
      'description' in node && node.description ? { ...node, description: undefined } : undefined,
  });

const projectSdl = (
  sdl: string,
  names: readonly string[],
  namedTypes: readonly string[]
): string => {
  const normalized = normalizeSdl(sdl);
  const schema = buildSchema(normalized, { assumeValidSDL: true });
  const kept = keptRootFields(schema, names);
  const rootNames = new Set(
    ROOT_OPERATIONS.flatMap((operation) => rootTypeOf(schema, operation)?.name ?? [])
  );

  // Kept whole, including a root type a result field reaches, as a selection can use any field.
  const reachable = new Set<string>();
  const expanded = new Set<string>();
  const visitImplemented = (type: GraphQLNamedType) => {
    if (isObjectType(type) || isInterfaceType(type)) {
      type.getInterfaces().forEach((implemented) => visitType(implemented, false));
    }
  };
  // A value typed as an interface can be any type that implements it, but a type implementing an
  // interface doesn't need the others: with Relay's `Node`, that would be most of the schema.
  const visitType = (type: GraphQLNamedType, isValueType = true) => {
    if (isSpecifiedScalarType(type)) {
      return;
    }
    if (!reachable.has(type.name)) {
      reachable.add(type.name);
      visitImplemented(type);
      referencedTypesOf(type).forEach((referenced) => visitType(referenced));
    }
    if (isValueType && isInterfaceType(type) && !expanded.has(type.name)) {
      expanded.add(type.name);
      schema.getPossibleTypes(type).forEach((possible) => visitType(possible));
    }
  };
  for (const [rootName, fields] of kept) {
    const root = schema.getType(rootName);
    if (isObjectType(root)) {
      const rootFields = root.getFields();
      visitImplemented(root);
      // A root implementing an interface needs the fields it declares, even those unused.
      root
        .getInterfaces()
        .forEach((implemented) =>
          Object.keys(implemented.getFields()).forEach((name) => fields.add(name))
        );
      for (const field of fields) {
        visitType(getNamedType(rootFields[field].type));
        rootFields[field].args.forEach((arg) => visitType(getNamedType(arg.type)));
      }
    }
  }
  // A fragment can name a type the root fields don't reach, such as `... on Card` inside a fragment
  // on `Node`. Naming an interface doesn't call for its implementers, and naming a root type doesn't
  // call for its other fields.
  for (const name of namedTypes) {
    const type = schema.getType(name);
    if (type && !rootNames.has(name)) {
      visitType(type, false);
    }
  }
  // A fragment spread between two abstract types is valid only if they share a possible type, so
  // keep one object of each overlap that isn't already kept.
  const abstractNamed = namedTypes.flatMap((name) => {
    const type = schema.getType(name);
    return type && isAbstractType(type) ? [type] : [];
  });
  abstractNamed.forEach((first, index) =>
    abstractNamed.slice(index + 1).forEach((second) => {
      const shared = schema
        .getPossibleTypes(first)
        .filter((possible) => schema.isSubType(second, possible));
      if (shared.length > 0 && !shared.some(({ name }) => reachable.has(name))) {
        const [overlap] = [...shared].sort((a, b) => (a.name < b.name ? -1 : 1));
        visitType(overlap, false);
      }
    })
  );
  const directives = new Set<string>();
  for (const directive of schema.getDirectives()) {
    if (
      !isSpecifiedDirective(directive) &&
      directive.locations.some((location) => EXECUTABLE_DIRECTIVE_LOCATIONS.has(location))
    ) {
      directives.add(directive.name);
      directive.args.forEach((arg) => visitType(getNamedType(arg.type)));
    }
  }

  const definitions = parse(normalized, { noLocation: true }).definitions.flatMap(
    (definition): DefinitionNode[] => {
      if (definition.kind === Kind.SCHEMA_DEFINITION) {
        const operationTypes = definition.operationTypes.filter(
          ({ type }) => kept.has(type.name.value) || reachable.has(type.name.value)
        );
        return [{ ...definition, operationTypes }];
      }
      if (definition.kind === Kind.DIRECTIVE_DEFINITION) {
        return directives.has(definition.name.value) ? [definition] : [];
      }
      if (!('name' in definition) || definition.name === undefined) {
        return [definition];
      }
      const { value: name } = definition.name;
      if (reachable.has(name)) {
        return [definition];
      }
      if (rootNames.has(name)) {
        const fields = kept.get(name);
        return fields && definition.kind === Kind.OBJECT_TYPE_DEFINITION
          ? [
              {
                ...definition,
                fields: definition.fields?.filter((field) => fields.has(field.name.value)),
              },
            ]
          : [];
      }
      return [];
    }
  );
  return `${print(withoutDescriptions({ kind: Kind.DOCUMENT, definitions }))}\n`;
};

const STRIPPED_SCHEMA_KEYWORDS = new Set(['description', 'title', 'examples', '$comment']);
const SCHEMA_NAME_MAPS = new Set([
  'properties',
  'patternProperties',
  '$defs',
  'definitions',
  'dependentSchemas',
  'dependencies',
]);
const LITERAL_SCHEMA_KEYWORDS = new Set(['enum', 'const', 'default', 'dependentRequired']);

// Documentation changes without the contract changing.
const contractOfSchema = (schema: unknown): unknown => {
  if (Array.isArray(schema)) {
    return schema.map(contractOfSchema);
  }
  if (!isJsonObject(schema)) {
    return schema;
  }
  return Object.fromEntries(
    Object.entries(schema).flatMap(([keyword, value]): Array<[string, unknown]> => {
      if (STRIPPED_SCHEMA_KEYWORDS.has(keyword)) {
        return [];
      }
      if (LITERAL_SCHEMA_KEYWORDS.has(keyword)) {
        return [[keyword, value]];
      }
      if (SCHEMA_NAME_MAPS.has(keyword) && isJsonObject(value)) {
        return [
          [
            keyword,
            Object.fromEntries(
              Object.entries(value).map(([name, entry]) => [name, contractOfSchema(entry)])
            ),
          ],
        ];
      }
      return [[keyword, contractOfSchema(value)]];
    })
  );
};

// The emulator names an MCP call after its method and tool.
const toolNameOf = (name: string): string => name.replace(/^tools\/call /, '');

const projectTools = (tools: readonly McpTool[], names: readonly string[]): string => {
  const used = new Set(names.map(toolNameOf));
  const projected = tools
    .filter(({ name }) => used.has(name))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .map(({ name, inputSchema, outputSchema, annotations }) => ({
      name,
      inputSchema: contractOfSchema(inputSchema),
      ...(outputSchema === undefined ? {} : { outputSchema: contractOfSchema(outputSchema) }),
      ...(typeof annotations?.readOnlyHint === 'boolean'
        ? { annotations: { readOnlyHint: annotations.readOnlyHint } }
        : {}),
    }));
  return toStableJson({ tools: projected });
};

/**
 * What a source's snapshot holds: the operations the connector calls, by name as the emulator names
 * them, and what they reference, without documentation. `namedTypes` are the types GraphQL
 * requests name, which they need to validate against the snapshot.
 */
export const projectProtocolSpec = (
  spec: ProtocolSpec,
  names: readonly string[],
  namedTypes: readonly string[] = []
): string =>
  spec.format === 'mcp' ? projectTools(spec.tools, names) : projectSdl(spec.sdl, names, namedTypes);

// As with `oasdiff`'s levels, a response that widens is breaking, as a connector reading it may not
// handle the new value. New optional input is the one dangerous change that can't affect it.
const NON_BREAKING_DANGEROUS = new Set<string>([
  DangerousChangeType.OPTIONAL_ARG_ADDED,
  DangerousChangeType.OPTIONAL_INPUT_FIELD_ADDED,
]);
const BREAKING_TYPES = new Set<string>([
  ...Object.values(BreakingChangeType),
  ...Object.values(DangerousChangeType).filter((type) => !NON_BREAKING_DANGEROUS.has(type)),
]);

const deprecationsOf = (schema: GraphQLSchema): Map<string, string> => {
  const deprecated = new Map<string, string>();
  for (const type of Object.values(schema.getTypeMap())) {
    if (isObjectType(type) || isInterfaceType(type) || isInputObjectType(type)) {
      for (const field of Object.values(type.getFields())) {
        if (field.deprecationReason) {
          deprecated.set(`${type.name}.${field.name}`, field.deprecationReason);
        }
        for (const arg of 'args' in field ? field.args : []) {
          if (arg.deprecationReason) {
            deprecated.set(`${type.name}.${field.name}(${arg.name})`, arg.deprecationReason);
          }
        }
      }
    }
    if (isEnumType(type)) {
      for (const value of type.getValues()) {
        if (value.deprecationReason) {
          deprecated.set(`${type.name}.${value.name}`, value.deprecationReason);
        }
      }
    }
  }
  return deprecated;
};

// Enums a response can hold, as opposed to those only a request sends.
const outputEnumsOf = (schema: GraphQLSchema): Set<string> => {
  const enums = new Set<string>();
  for (const type of Object.values(schema.getTypeMap())) {
    if (isObjectType(type) || isInterfaceType(type)) {
      for (const field of Object.values(type.getFields())) {
        const returned = getNamedType(field.type);
        if (isEnumType(returned)) {
          enums.add(returned.name);
        }
      }
    }
  }
  return enums;
};

const ENUM_VALUE_ADDED = /^Enum value (\w+)\.\w+ was added\.$/;

const diffGraphQL = (base: string, current: string): SpecChange[] => {
  const before = buildSchema(base, { assumeValidSDL: true });
  const after = buildSchema(current, { assumeValidSDL: true });
  const outputEnums = outputEnumsOf(before);
  const isBreaking = ({ type, description }: { type: string; description: string }): boolean => {
    if (type !== DangerousChangeType.VALUE_ADDED_TO_ENUM) {
      return BREAKING_TYPES.has(type);
    }
    // A value an input-only enum gains widens what the connector may send, not what it handles.
    const [, enumName] = ENUM_VALUE_ADDED.exec(description) ?? [];
    return enumName === undefined || outputEnums.has(enumName);
  };
  const changes = findSchemaChanges(before, after).map(
    (change): SpecChange => ({
      kind: isBreaking(change) ? 'breaking' : 'non-breaking',
      id: change.type,
      text: change.description,
    })
  );
  const wasDeprecated = deprecationsOf(before);
  const deprecations = [...deprecationsOf(after)]
    .filter(([name]) => !wasDeprecated.has(name))
    .map(
      ([name, reason]): SpecChange => ({
        kind: 'deprecation',
        id: 'DEPRECATION_ADDED',
        text: `${name} is deprecated: ${reason}`,
      })
    );
  return [...changes, ...deprecations];
};

type SchemaDirection = 'input' | 'output';

// Undefined when the schema doesn't constrain it.
const typesOf = (schema: Record<string, unknown>): string[] | undefined => {
  const types = [schema.type].flat().filter((type): type is string => typeof type === 'string');
  return types.length > 0 ? types : undefined;
};

const enumOf = ({ enum: values }: Record<string, unknown>): unknown[] | undefined =>
  Array.isArray(values) ? values : undefined;

const stringsOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const COMPARED_KEYWORDS = new Set(['type', 'enum', 'required', 'properties', 'items']);

const diffSchema = (
  base: unknown,
  current: unknown,
  direction: SchemaDirection,
  at: string,
  report: (kind: SpecChange['kind'], id: string, text: string) => void
): void => {
  if (!isJsonObject(base) || !isJsonObject(current)) {
    if (!isEqual(base, current)) {
      report('breaking', `mcp-${direction}-schema-changed`, `${at} changed`);
    }
    return;
  }
  // Input narrows and output widens in what a connector has to handle.
  const compareValues = (
    keyword: string,
    before: unknown[] | undefined,
    after: unknown[] | undefined
  ) => {
    if (before === undefined && after === undefined) {
      return;
    }
    if (before === undefined || after === undefined) {
      const narrowed = before === undefined;
      const id = `mcp-${direction}-${keyword}-changed`;
      if (narrowed === (direction === 'input')) {
        report(
          'breaking',
          id,
          direction === 'input'
            ? `${at} now only takes ${keyword} ${JSON.stringify(after)}`
            : `${at} is no longer limited to ${keyword} ${JSON.stringify(before)}`
        );
      } else {
        report('non-breaking', id, `${at} ${keyword} changed`);
      }
      return;
    }
    const removed = differenceWith(before, after, isEqual);
    const added = differenceWith(after, before, isEqual);
    const risky = direction === 'input' ? removed : added;
    if (risky.length > 0) {
      report(
        'breaking',
        `mcp-${direction}-${keyword}-changed`,
        `${at} ${direction === 'input' ? 'no longer takes' : 'can now return'} ${keyword} ${risky
          .map((value) => JSON.stringify(value))
          .join(', ')}`
      );
    } else if (removed.length + added.length > 0) {
      report('non-breaking', `mcp-${direction}-${keyword}-changed`, `${at} ${keyword} changed`);
    }
  };
  compareValues('type', typesOf(base), typesOf(current));
  compareValues('enum', enumOf(base), enumOf(current));

  const [requiredBefore, requiredAfter] = [stringsOf(base.required), stringsOf(current.required)];
  // A required input the connector doesn't send, or an output property that may now be missing.
  const [riskyRequired, safeRequired] =
    direction === 'input'
      ? [
          requiredAfter.filter((name) => !requiredBefore.includes(name)),
          requiredBefore.filter((name) => !requiredAfter.includes(name)),
        ]
      : [
          requiredBefore.filter((name) => !requiredAfter.includes(name)),
          requiredAfter.filter((name) => !requiredBefore.includes(name)),
        ];
  riskyRequired.forEach((name) =>
    report(
      'breaking',
      `mcp-${direction}-required-changed`,
      `${at}.${String(name)} ${direction === 'input' ? 'is now required' : 'may now be missing'}`
    )
  );
  safeRequired.forEach((name) =>
    report(
      'non-breaking',
      `mcp-${direction}-required-changed`,
      `${at}.${String(name)} changed from or to required`
    )
  );

  const [propertiesBefore, propertiesAfter] = [base.properties, current.properties].map((value) =>
    isJsonObject(value) ? value : {}
  );
  for (const [name, property] of Object.entries(propertiesBefore)) {
    if (name in propertiesAfter) {
      diffSchema(property, propertiesAfter[name], direction, `${at}.${name}`, report);
    } else {
      report('breaking', `mcp-${direction}-property-removed`, `${at}.${name} was removed`);
    }
  }
  for (const name of Object.keys(propertiesAfter).filter((key) => !(key in propertiesBefore))) {
    report('non-breaking', `mcp-${direction}-property-added`, `${at}.${name} was added`);
  }
  if (base.items !== undefined || current.items !== undefined) {
    diffSchema(base.items, current.items, direction, `${at}[]`, report);
  }
  // Bounds, patterns, combinators and so on: not worth a rule each, so any change gets a look.
  const others = new Set(
    [...Object.keys(base), ...Object.keys(current)].filter((key) => !COMPARED_KEYWORDS.has(key))
  );
  for (const keyword of others) {
    if (!isEqual(base[keyword], current[keyword])) {
      report('breaking', `mcp-${direction}-schema-changed`, `${at} ${keyword} changed`);
    }
  }
};

const diffMcp = (base: string, current: string): SpecChange[] => {
  const changes: SpecChange[] = [];
  const [before, after] = [readTools(base), readTools(current)];
  for (const tool of before) {
    const report = (kind: SpecChange['kind'], id: string, text: string) =>
      changes.push({ kind, id, text: `${tool.name}: ${text}`, operation: tool.name });
    const latest = after.find(({ name }) => name === tool.name);
    if (!latest) {
      report('breaking', 'mcp-tool-removed', 'the tool was removed');
    } else {
      diffSchema(tool.inputSchema, latest.inputSchema, 'input', 'input', report);
      if (tool.outputSchema !== undefined || latest.outputSchema !== undefined) {
        diffSchema(tool.outputSchema, latest.outputSchema, 'output', 'output', report);
      }
      const [wasReadOnly, isReadOnly] = [tool, latest].map(
        ({ annotations }) => annotations?.readOnlyHint === true
      );
      if (wasReadOnly !== isReadOnly) {
        // Read actions may call only read-only tools, so losing the hint breaks them.
        report(
          wasReadOnly ? 'breaking' : 'non-breaking',
          'mcp-read-only-changed',
          'its readOnlyHint changed'
        );
      }
    }
  }
  return changes;
};

/** Classifies how a source's snapshot changed, as `oasdiff changelog` does for OpenAPI. */
export const diffProtocolSnapshots = (
  format: ProtocolFormat,
  base: string,
  current: string
): SpecChange[] => (format === 'mcp' ? diffMcp(base, current) : diffGraphQL(base, current));
