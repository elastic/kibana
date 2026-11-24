/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseOasdiff, type OasdiffEntry } from '@kbn/api-contracts';
import { isObject } from './schema_helpers';
import { serializeCanonicalJson, type StepContract } from './step_contracts';
import type { JsonObject, JsonValue } from './types';

/** A breaking change to a step contract that workflows-eng accepted. */
export interface StepContractsAllowlistEntry {
  stepId: string;
  /** The rule of the change, such as `response-required-property-removed`. Any rule when omitted. */
  rule?: string;
  reason: string;
}

export type StepContractChangeDisposition = 'blocking' | 'report_only' | 'allowlisted';

export interface StepContractChange {
  stepId: string;
  /** An oasdiff rule id for schema changes, or one of the `step-*` rules of this check. */
  rule: string;
  description: string;
  disposition: StepContractChangeDisposition;
  /** Why the change doesn't fail the check, when it doesn't. */
  note?: string;
}

export interface StepContractsComparison {
  /** Steps that aren't at the base. */
  addedSteps: string[];
  /** Steps that workflows-eng hasn't approved yet. They fail the check. */
  unapprovedSteps: string[];
  changes: StepContractChange[];
}

/** Finds the breaking changes between two OpenAPI documents, such as `runOasdiff`. */
export type OpenApiDiffRunner = (base: JsonObject, head: JsonObject) => OasdiffEntry[];

export const STEP_REMOVED_RULE = 'step-removed';
export const STEP_EXPOSURE_NARROWED_RULE = 'step-exposure-narrowed';

const EXPOSURE_RANK: Readonly<Record<string, number>> = { open: 0, internal: 1, managed_only: 2 };

const DEFINITIONS_REF_PREFIX = '#/definitions/';
const COMPONENTS_REF_PREFIX = '#/components/schemas/';
const EMPTY_OBJECT_SCHEMA: JsonObject = { type: 'object' };

const stepPath = (id: string): string => `/${id}`;

const serializeSchemas = ({ input, config, output }: StepContract): string =>
  serializeCanonicalJson({ input, output, ...(config ? { config } : {}) });

// OpenAPI component names only allow letters, digits, `.`, `-` and `_`.
const toComponentName = (prefix: string, definitionName: string): string =>
  `${prefix}${definitionName.replace(/~1/g, '/').replace(/~0/g, '~')}`.replace(
    /[^A-Za-z0-9._-]/g,
    '_'
  );

// The keywords of an OpenAPI 3.0 Schema Object, besides `x-` extensions.
const OPENAPI_SCHEMA_KEYWORDS: ReadonlySet<string> = new Set([
  '$ref',
  'additionalProperties',
  'allOf',
  'anyOf',
  'default',
  'deprecated',
  'description',
  'discriminator',
  'enum',
  'example',
  'exclusiveMaximum',
  'exclusiveMinimum',
  'externalDocs',
  'format',
  'items',
  'maxItems',
  'maxLength',
  'maxProperties',
  'maximum',
  'minItems',
  'minLength',
  'minProperties',
  'minimum',
  'multipleOf',
  'not',
  'nullable',
  'oneOf',
  'pattern',
  'properties',
  'readOnly',
  'required',
  'title',
  'type',
  'uniqueItems',
  'writeOnly',
  'xml',
]);
const SUBSCHEMA_KEYWORDS: ReadonlySet<string> = new Set(['additionalProperties', 'items', 'not']);
const SUBSCHEMA_LIST_KEYWORDS: ReadonlySet<string> = new Set(['allOf', 'anyOf', 'oneOf']);

// Keywords that describe a schema without constraining its values. A single `allOf` member is
// only merged into its parent when they share no other keyword.
const ANNOTATION_KEYWORDS: ReadonlySet<string> = new Set([
  'default',
  'deprecated',
  'description',
  'example',
  'externalDocs',
  'nullable',
  'readOnly',
  'title',
  'writeOnly',
]);

const mapValues = (object: JsonObject, mapper: (value: JsonValue) => JsonValue): JsonObject =>
  Object.fromEntries(Object.entries(object).map(([key, value]) => [key, mapper(value)]));

const definitionName = (value: JsonValue | undefined): string | undefined =>
  typeof value === 'string' && value.startsWith(DEFINITIONS_REF_PREFIX)
    ? value.slice(DEFINITIONS_REF_PREFIX.length)
    : undefined;

const collectDefinitionRefs = (value: JsonValue, refs: Set<string>): Set<string> => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectDefinitionRefs(item, refs));
  } else if (isObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      const name = key === '$ref' ? definitionName(child) : undefined;
      if (name !== undefined) {
        refs.add(name);
      } else {
        collectDefinitionRefs(child, refs);
      }
    }
  }
  return refs;
};

// The definitions that reference themselves, directly or through others. They can't be inlined.
const findRecursiveDefinitions = (definitions: JsonObject): Set<string> => {
  const edges = new Map(
    Object.entries(definitions).map(([name, definition]) => [
      name,
      collectDefinitionRefs(definition, new Set()),
    ])
  );
  const reaches = (from: string, target: string, seen: Set<string>): boolean =>
    [...(edges.get(from) ?? [])].some((next) => {
      if (next === target) {
        return true;
      }
      if (seen.has(next)) {
        return false;
      }
      seen.add(next);
      return reaches(next, target, seen);
    });
  return new Set([...edges.keys()].filter((name) => reaches(name, name, new Set())));
};

const singleEnumValue = (member: JsonValue, property: string): string | undefined => {
  const schema =
    isObject(member) && isObject(member.properties) ? member.properties[property] : null;
  const values = isObject(schema) ? schema.enum : undefined;
  return Array.isArray(values) && values.length === 1 && values[0] !== null
    ? String(values[0])
    : undefined;
};

// oasdiff pairs the members of a `oneOf` or `anyOf` by title. Without one, it can't pair members
// that change together (such as the variants of a union that share a schema), and reports them
// as removed and added instead of the changes inside them. Titles the members of a discriminated
// union by their discriminator value, such as `type=eql`, which is stable across versions.
const withVariantTitles = (members: JsonValue[]): JsonValue[] => {
  const [first] = members;
  if (members.length < 2 || !isObject(first) || !isObject(first.properties)) {
    return members;
  }
  const discriminator = Object.keys(first.properties)
    .sort()
    .find((property) => {
      const values = members.map((member) => singleEnumValue(member, property));
      return values.every((value) => value !== undefined) && new Set(values).size === values.length;
    });
  if (discriminator === undefined) {
    return members;
  }
  return members.map((member) =>
    isObject(member) && member.title === undefined
      ? { ...member, title: `${discriminator}=${singleEnumValue(member, discriminator)}` }
      : member
  );
};

interface ConversionContext {
  definitions: JsonObject;
  recursive: Set<string>;
  /** The component name of each recursive definition, by its name in `definitions`. */
  componentNames: Map<string, string>;
  prefix: string;
  components: JsonObject;
}

// Merges a converted `allOf` member, or an inlined definition, with the keywords next to it.
const mergeSchema = (schema: JsonValue, siblings: JsonObject): JsonValue => {
  if (Object.keys(siblings).length === 0) {
    return schema;
  }
  const canMerge =
    isObject(schema) &&
    !('$ref' in schema) &&
    Object.keys(siblings).every((key) => !(key in schema) || ANNOTATION_KEYWORDS.has(key));
  return canMerge ? { ...schema, ...siblings } : { allOf: [schema], ...siblings };
};

// Converts a schema from a contract file to an OpenAPI 3.0 Schema Object for oasdiff:
// - Inlines the `#/definitions/` references, and merges single-member `allOf` lists into their
//   parent. oasdiff compares `allOf` members by reference name, so zod renumbering its
//   definitions (`__schema0`, `__schema1`, ...) would otherwise look like a breaking change, and
//   it reports changes inside an `allOf` at a lower level.
// - Keeps the recursive definitions as components, referenced with a plain `$ref`, which oasdiff
//   compares by content.
// - Drops the keywords OpenAPI doesn't define (zod copies `.meta()` fields, such as
//   `jsonSchemaModel`, into its output). It only recurses into subschemas, so a property named
//   like a keyword keeps its name.
const toOpenApiSchema = (schema: JsonValue, context: ConversionContext): JsonValue => {
  if (!isObject(schema)) {
    return schema;
  }
  const convert = (value: JsonValue) => toOpenApiSchema(value, context);
  const { $ref, allOf, ...rest } = schema;
  const siblings: JsonObject = {};
  for (const [key, value] of Object.entries(rest)) {
    if (key === 'properties' && isObject(value)) {
      siblings[key] = mapValues(value, convert);
    } else if (SUBSCHEMA_KEYWORDS.has(key)) {
      siblings[key] = convert(value);
    } else if (SUBSCHEMA_LIST_KEYWORDS.has(key) && Array.isArray(value)) {
      siblings[key] = withVariantTitles(value.map(convert));
    } else if (OPENAPI_SCHEMA_KEYWORDS.has(key) || key.startsWith('x-')) {
      siblings[key] = value;
    }
  }

  const name = definitionName($ref);
  if (name !== undefined && context.recursive.has(name)) {
    let componentName = context.componentNames.get(name);
    if (componentName === undefined) {
      // Numbered in the order the conversion meets them, which doesn't change when zod
      // renumbers its definitions. Registered before converting, so the recursion stops here.
      componentName = toComponentName(context.prefix, `recursive${context.componentNames.size}`);
      context.componentNames.set(name, componentName);
      context.components[componentName] = {};
      context.components[componentName] = convert(context.definitions[name] ?? {});
    }
    return mergeSchema({ $ref: `${COMPONENTS_REF_PREFIX}${componentName}` }, siblings);
  }
  if (name !== undefined) {
    return mergeSchema(convert(context.definitions[name] ?? {}), siblings);
  }
  if (Array.isArray(allOf) && allOf.length === 1) {
    return mergeSchema(convert(allOf[0]), siblings);
  }
  return {
    ...(typeof $ref === 'string' ? { $ref } : {}),
    ...siblings,
    ...(Array.isArray(allOf) ? { allOf: allOf.map(convert) } : {}),
  };
};

const toOpenApiSection = (
  schema: JsonObject,
  prefix: string,
  components: JsonObject
): JsonValue => {
  const { definitions, ...root } = schema;
  const definitionsMap = isObject(definitions) ? definitions : {};
  return toOpenApiSchema(root, {
    definitions: definitionsMap,
    recursive: findRecursiveDefinitions(definitionsMap),
    componentNames: new Map(),
    prefix,
    components,
  });
};

/**
 * Wraps step contracts in an OpenAPI 3.0 document with a `POST /<step id>` operation per step,
 * so oasdiff can compare two versions of them: the request body holds what the workflow writes
 * (the `with` block and the step-level config) and the response holds the output.
 */
export const buildStepContractsOpenApi = (contracts: StepContract[]): JsonObject => {
  const schemas: JsonObject = {};
  const paths: JsonObject = {};
  for (const { id, input, config, output } of contracts) {
    paths[stepPath(id)] = {
      post: {
        operationId: id,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  with: toOpenApiSection(input, `${id}.input.`, schemas),
                  config: toOpenApiSection(config ?? EMPTY_OBJECT_SCHEMA, `${id}.config.`, schemas),
                },
                required: ['with', 'config'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'The step output',
            content: {
              'application/json': { schema: toOpenApiSection(output, `${id}.output.`, schemas) },
            },
          },
        },
      },
    };
  }
  return {
    openapi: '3.0.3',
    info: { title: 'Workflow step contracts', version: '1' },
    paths,
    components: { schemas },
  };
};

interface FoundChange {
  stepId: string;
  rule: string;
  description: string;
  /** Set when the change is reported without failing the check, whatever the step. */
  reportOnlyReason?: string;
}

const findMetadataChanges = (base: StepContract, head: StepContract | undefined): FoundChange[] => {
  const { id: stepId } = base;
  if (!head) {
    return [
      {
        stepId,
        rule: STEP_REMOVED_RULE,
        description: 'The step was removed. Workflows that use it fail.',
      },
    ];
  }
  const baseRank = EXPOSURE_RANK[base.exposure];
  const headRank = EXPOSURE_RANK[head.exposure];
  if (baseRank === undefined || headRank === undefined || headRank <= baseRank) {
    return [];
  }
  const description = `The exposure changed from \`${base.exposure}\` to \`${head.exposure}\`.`;
  return [
    head.exposure === 'managed_only'
      ? {
          stepId,
          rule: STEP_EXPOSURE_NARROWED_RULE,
          description: `${description} Other workflows that use the step get an error.`,
        }
      : {
          stepId,
          rule: STEP_EXPOSURE_NARROWED_RULE,
          description: `${description} Other workflows that use the step get a warning.`,
          reportOnlyReason: 'Workflows that use the step keep working.',
        },
  ];
};

const classify = (
  { reportOnlyReason, ...change }: FoundChange,
  allowlist: StepContractsAllowlistEntry[]
): StepContractChange => {
  if (reportOnlyReason !== undefined) {
    return { ...change, disposition: 'report_only', note: reportOnlyReason };
  }
  const entry = allowlist.find(
    ({ stepId, rule }) => stepId === change.stepId && (rule === undefined || rule === change.rule)
  );
  return entry
    ? { ...change, disposition: 'allowlisted', note: entry.reason }
    : { ...change, disposition: 'blocking' };
};

/**
 * Finds the steps workflows-eng hasn't approved, and the breaking changes between the base and
 * head contracts: removed steps, narrowed exposure, and the schema changes oasdiff reports. A
 * breaking change fails whatever the step's stability: workflows use tech preview and beta
 * steps too.
 */
export const compareStepContracts = ({
  base,
  head,
  approvedSteps,
  allowlist,
  runOpenApiDiff,
}: {
  base: StepContract[];
  head: StepContract[];
  approvedSteps: string[];
  allowlist: StepContractsAllowlistEntry[];
  runOpenApiDiff: OpenApiDiffRunner;
}): StepContractsComparison => {
  const baseById = new Map(base.map((contract) => [contract.id, contract]));
  const headById = new Map(head.map((contract) => [contract.id, contract]));

  const found = base.flatMap((contract) =>
    findMetadataChanges(contract, headById.get(contract.id))
  );

  // Only the steps whose schemas changed go to oasdiff, so most runs don't need it.
  const changedPairs = base.flatMap((baseContract) => {
    const headContract = headById.get(baseContract.id);
    return headContract && serializeSchemas(headContract) !== serializeSchemas(baseContract)
      ? [{ baseContract, headContract }]
      : [];
  });
  if (changedPairs.length > 0) {
    const entries = runOpenApiDiff(
      buildStepContractsOpenApi(changedPairs.map(({ baseContract }) => baseContract)),
      buildStepContractsOpenApi(changedPairs.map(({ headContract }) => headContract))
    );
    for (const { path, oasdiffId, type, reason, reportOnly, policyReason } of parseOasdiff(
      entries
    )) {
      found.push({
        stepId: path.slice(1),
        rule: oasdiffId ?? type,
        description: reason,
        ...(reportOnly ? { reportOnlyReason: policyReason ?? 'Additive change.' } : {}),
      });
    }
  }

  const approved = new Set(approvedSteps);
  const headIds = head.map(({ id }) => id).sort();
  return {
    addedSteps: headIds.filter((id) => !baseById.has(id)),
    unapprovedSteps: headIds.filter((id) => !approved.has(id)),
    changes: found.map((change) => classify(change, allowlist)),
  };
};

/** Checks that a JSON value is the approved steps file. `source` names it in the error. */
export const parseApprovedSteps = (value: JsonValue, source: string): string[] => {
  const steps = isObject(value) ? value.steps : undefined;
  if (!Array.isArray(steps) || !steps.every((id) => typeof id === 'string')) {
    throw new Error(`${source} is not an approved steps file: expected a "steps" array of ids`);
  }
  return steps.filter((id): id is string => typeof id === 'string');
};

/** Checks that a JSON value is an allowlist file. `source` names it in the error. */
export const parseStepContractsAllowlist = (
  value: JsonValue,
  source: string
): StepContractsAllowlistEntry[] => {
  const entries = isObject(value) ? value.entries : undefined;
  if (!Array.isArray(entries)) {
    throw new Error(`${source} is not a step contracts allowlist: expected an "entries" array`);
  }
  return entries.map((entry, index) => {
    const { stepId, rule, reason } = isObject(entry) ? entry : {};
    if (
      typeof stepId !== 'string' ||
      typeof reason !== 'string' ||
      (rule !== undefined && typeof rule !== 'string')
    ) {
      throw new Error(
        `${source}: entry ${index} needs a string "stepId" and "reason", and an optional string "rule"`
      );
    }
    return { stepId, reason, ...(rule === undefined ? {} : { rule }) };
  });
};

const entryKey = ({ stepId, rule, reason }: StepContractsAllowlistEntry): string =>
  JSON.stringify([stepId, rule ?? null, reason]);

/**
 * The allowlist entries the pull request adds. Only those apply, so an entry can't let a later
 * breaking change of the same step through.
 */
export const getAddedAllowlistEntries = (
  base: StepContractsAllowlistEntry[],
  head: StepContractsAllowlistEntry[]
): StepContractsAllowlistEntry[] => {
  const baseKeys = new Set(base.map(entryKey));
  return head.filter((entry) => !baseKeys.has(entryKey(entry)));
};

const escapeCell = (text: string): string => text.replace(/\|/g, '\\|').replace(/\n/g, ' ');

const formatTable = (changes: StepContractChange[], withNote: boolean): string[] => [
  withNote ? '| Step | Change | Rule | Note |' : '| Step | Change | Rule |',
  withNote ? '| --- | --- | --- | --- |' : '| --- | --- | --- |',
  ...changes.map(
    ({ stepId, description, rule, note }) =>
      `| \`${stepId}\` | ${escapeCell(description)} | \`${rule}\` |${
        withNote ? ` ${escapeCell(note ?? '')} |` : ''
      }`
  ),
];

/** Formats the comparison as Markdown, for the build log and the Buildkite annotation. */
export const formatStepContractsReport = (
  { addedSteps, unapprovedSteps, changes }: StepContractsComparison,
  {
    approvedStepsPath,
    allowlistPath,
    docsLink,
  }: { approvedStepsPath: string; allowlistPath: string; docsLink: string }
): string => {
  const blocking = changes.filter(({ disposition }) => disposition === 'blocking');
  const allowlisted = changes.filter(({ disposition }) => disposition === 'allowlisted');
  const reportOnly = changes.filter(({ disposition }) => disposition === 'report_only');
  const lines: string[] = ['### Workflow step contracts', ''];

  if (unapprovedSteps.length > 0) {
    lines.push(
      `**${unapprovedSteps.length} step(s) need workflows-eng approval:** ${unapprovedSteps
        .map((id) => `\`${id}\``)
        .join(', ')}. ` +
        `Add them to \`${approvedStepsPath}\`, which requests a review from workflows-eng (see [Step contract check](${docsLink})).`,
      ''
    );
  }
  if (blocking.length > 0) {
    lines.push(
      `**This PR makes ${blocking.length} breaking change(s) to workflow step contracts.** ` +
        `Make the change compatible, or, if it's intended, ask workflows-eng to accept it with an entry in \`${allowlistPath}\` (see [Step contract check](${docsLink})).`,
      '',
      ...formatTable(blocking, false),
      ''
    );
  }
  if (allowlisted.length > 0) {
    lines.push(
      'Breaking changes accepted by the allowlist:',
      '',
      ...formatTable(allowlisted, true),
      ''
    );
  }
  if (reportOnly.length > 0) {
    lines.push('Changes reported for awareness:', '', ...formatTable(reportOnly, true), '');
  }
  if (addedSteps.length > 0) {
    lines.push(`New steps: ${addedSteps.map((id) => `\`${id}\``).join(', ')}`, '');
  }
  if (lines.length === 2) {
    lines.push('No breaking changes.');
  }
  return lines.join('\n').trimEnd();
};
