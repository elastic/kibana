/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { z } from '@kbn/zod/v4';
import * as connectorsSpecs from './all_specs';
import type { ConnectorSpec } from './connector_spec';

type JsonSchema = Record<string, unknown>;

const allSpecs = Object.entries(connectorsSpecs) as Array<[string, ConnectorSpec]>;
const DOCS_DIR = path.join(REPO_ROOT, 'docs/reference');
const CONNECTOR_DOCS_DIR = path.join(DOCS_DIR, 'connectors-kibana');
const CONNECTORS_LIST_SNIPPET = path.join(
  CONNECTOR_DOCS_DIR,
  '_snippets/data-context-sources-connectors-list.md'
);
const AVAILABILITY_STATEMENTS = {
  agentBuilderAndWorkflows:
    /You can use this connector in \*\*Agent Builder\*\* and \*\*Workflows\*\*\./,
  agentBuilderOnly: /\*\*Agent Builder\*\* only/i,
  workflowsOnly: /\*\*Workflows\*\* only/i,
};
type Availability = keyof typeof AVAILABILITY_STATEMENTS;
const NOT_YET_AVAILABLE_MARKER = '_(not yet available)_';
const WORKFLOW_USE_CLAIM =
  /\b(workflow[- ]only|workflow steps?|reserved for workflows|available to workflows|(?:from|in|for|by) (?:a |your )?workflows?|workflows? or agents?|workflows and agents|workflow authors?)\b/gi;
const INTERNAL_VOCABULARY =
  /\b(custom connectors?|MCP-native|connector specs?|stack connectors?)\b/gi;
const UNION_KEYS = ['anyOf', 'oneOf', 'allOf'] as const;

const isJsonSchema = (value: unknown): value is JsonSchema =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Mirrors the id-to-page derivation in `getDocsUrlFromSpec` (kbn-alerts-ui-shared). */
const getDocsPagePath = (spec: ConnectorSpec): string | undefined => {
  if (spec.metadata.docsUrl !== undefined) {
    return undefined;
  }
  const slug = spec.metadata.id
    .replace(/^\./, '')
    .replace(/_/g, '-')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
  return path.join(CONNECTOR_DOCS_DIR, `${slug}-action-type.md`);
};

/** Normalizes an action name or a docs heading (`insertOne`, "Insert one", `` `insertOne` ``) to one key. */
const toHeadingKey = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]/g, '');

const getAvailability = ({ metadata }: ConnectorSpec): Availability | undefined => {
  const agentBuilder = metadata.supportedFeatureIds.includes('agentBuilder');
  const workflows = metadata.supportedFeatureIds.includes('workflows');
  if (agentBuilder && workflows) {
    return 'agentBuilderAndWorkflows';
  }
  if (agentBuilder) {
    return 'agentBuilderOnly';
  }
  return workflows ? 'workflowsOnly' : undefined;
};

const toInputJsonSchema = (schema: z.ZodType): JsonSchema =>
  z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as JsonSchema;

interface InputSchemaViolations {
  unboundedStrings: string[];
  unboundedArrays: string[];
  undescribedParams: string[];
}

interface WalkContext {
  root: JsonSchema;
  violations: InputSchemaViolations;
  /** `$ref`s already expanded on the current path, so recursive schemas terminate. */
  seenRefs: ReadonlySet<string>;
}

const resolveRef = (ref: string, root: JsonSchema): JsonSchema => {
  if (ref === '#') {
    return root;
  }
  const [, defsKey, name] = /^#\/(\$defs|definitions)\/(.+)$/.exec(ref) ?? [];
  const defs = defsKey === undefined ? undefined : root[defsKey];
  const target = isJsonSchema(defs) ? defs[name] : undefined;
  if (!isJsonSchema(target)) {
    throw new Error(`Cannot resolve input schema $ref "${ref}"`);
  }
  return target;
};

const walkInputSchema = (
  node: JsonSchema,
  schemaPath: string,
  isParam: boolean,
  context: WalkContext
): void => {
  const { violations } = context;
  const { $ref, ...siblings } = node;
  const schema =
    typeof $ref === 'string' ? { ...resolveRef($ref, context.root), ...siblings } : node;

  if (isParam && typeof schema.description !== 'string') {
    violations.undescribedParams.push(schemaPath);
  }
  if (typeof $ref === 'string') {
    if (context.seenRefs.has($ref)) {
      return;
    }
    context = { ...context, seenRefs: new Set([...context.seenRefs, $ref]) };
  }
  if (
    schema.type === 'string' &&
    schema.maxLength === undefined &&
    schema.enum === undefined &&
    schema.const === undefined
  ) {
    violations.unboundedStrings.push(schemaPath);
  }
  if (schema.type === 'array' && schema.maxItems === undefined) {
    violations.unboundedArrays.push(schemaPath);
  }

  if (isJsonSchema(schema.properties)) {
    for (const [name, property] of Object.entries(schema.properties)) {
      if (isJsonSchema(property)) {
        walkInputSchema(property, `${schemaPath}.${name}`, true, context);
      }
    }
  }
  if (isJsonSchema(schema.items)) {
    walkInputSchema(schema.items, `${schemaPath}[]`, false, context);
  }
  if (isJsonSchema(schema.propertyNames)) {
    walkInputSchema(schema.propertyNames, `${schemaPath}{key}`, false, context);
  }
  if (isJsonSchema(schema.additionalProperties)) {
    walkInputSchema(schema.additionalProperties, `${schemaPath}{value}`, false, context);
  }
  for (const unionKey of UNION_KEYS) {
    const branches = schema[unionKey];
    if (Array.isArray(branches)) {
      branches.forEach((branch, index) => {
        if (isJsonSchema(branch)) {
          walkInputSchema(branch, `${schemaPath}.${unionKey}[${index}]`, false, context);
        }
      });
    }
  }
};

/** Walks an action input schema, following `$ref`s, and reports unbounded and undescribed fields. */
const collectInputViolations = (schema: z.ZodType, actionName: string): InputSchemaViolations => {
  const root = toInputJsonSchema(schema);
  const violations: InputSchemaViolations = {
    unboundedStrings: [],
    unboundedArrays: [],
    undescribedParams: [],
  };
  walkInputSchema(root, actionName, false, { root, violations, seenRefs: new Set(['#']) });
  return violations;
};

const getInputViolations = (spec: ConnectorSpec): InputSchemaViolations => {
  const violations: InputSchemaViolations = {
    unboundedStrings: [],
    unboundedArrays: [],
    undescribedParams: [],
  };
  for (const [actionName, action] of Object.entries(spec.actions)) {
    const actionViolations = collectInputViolations(action.input, actionName);
    violations.unboundedStrings.push(...actionViolations.unboundedStrings);
    violations.unboundedArrays.push(...actionViolations.unboundedArrays);
    violations.undescribedParams.push(...actionViolations.undescribedParams);
  }
  return violations;
};

const getLinkedDocs = (filePath: string, linkPattern: RegExp, baseDir: string): string[] =>
  [...fs.readFileSync(filePath, 'utf8').matchAll(linkPattern)].map(([, link]) =>
    path.join(baseDir, link)
  );

describe('connector spec quality contracts', () => {
  describe('documentation', () => {
    it.each(allSpecs)('%s has a docs page at the derived URL', (_exportName, spec) => {
      const docsPagePath = getDocsPagePath(spec);
      if (docsPagePath === undefined) {
        return;
      }
      expect(fs.existsSync(docsPagePath) ? [] : [path.relative(REPO_ROOT, docsPagePath)]).toEqual(
        []
      );
    });

    it.each(allSpecs)(
      '%s docs page states only the availability its supportedFeatureIds allow',
      (_exportName, spec) => {
        const docsPagePath = getDocsPagePath(spec);
        const availability = getAvailability(spec);
        if (docsPagePath === undefined || !fs.existsSync(docsPagePath) || !availability) {
          return;
        }
        const docsPage = fs.readFileSync(docsPagePath, 'utf8');
        const statedAvailability = (Object.keys(AVAILABILITY_STATEMENTS) as Availability[]).filter(
          (key) => AVAILABILITY_STATEMENTS[key].test(docsPage)
        );

        expect(statedAvailability).toEqual([availability]);
      }
    );

    it.each(allSpecs)(
      '%s docs page does not claim workflow use when workflows are not supported',
      (_exportName, spec) => {
        const docsPagePath = getDocsPagePath(spec);
        if (
          docsPagePath === undefined ||
          !fs.existsSync(docsPagePath) ||
          spec.metadata.supportedFeatureIds.includes('workflows')
        ) {
          return;
        }
        const matches = fs.readFileSync(docsPagePath, 'utf8').match(WORKFLOW_USE_CLAIM) ?? [];

        expect(matches).toEqual([]);
      }
    );

    it.each(allSpecs)(
      '%s docs page marks every non-tool action as not yet available when workflows are not supported',
      (_exportName, spec) => {
        const docsPagePath = getDocsPagePath(spec);
        if (
          docsPagePath === undefined ||
          !fs.existsSync(docsPagePath) ||
          spec.metadata.supportedFeatureIds.includes('workflows')
        ) {
          return;
        }
        const headings = fs
          .readFileSync(docsPagePath, 'utf8')
          .split('\n')
          .map((line) => ({
            name: toHeadingKey(line.split(NOT_YET_AVAILABLE_MARKER).join('')),
            marked: line.includes(NOT_YET_AVAILABLE_MARKER),
          }));
        const unmarked = Object.entries(spec.actions)
          .filter(([, action]) => !action.isTool)
          .map(([actionName]) => actionName)
          .filter((actionName) =>
            headings.every(({ name, marked }) => name !== toHeadingKey(actionName) || !marked)
          );

        expect(unmarked).toEqual([]);
      }
    );

    it.each(allSpecs)(
      '%s docs page marks only non-tool actions as not yet available',
      (_exportName, spec) => {
        const docsPagePath = getDocsPagePath(spec);
        if (docsPagePath === undefined || !fs.existsSync(docsPagePath)) {
          return;
        }
        const supportsWorkflows = spec.metadata.supportedFeatureIds.includes('workflows');
        const unavailableActionKeys = new Set(
          Object.entries(spec.actions)
            .filter(([, action]) => !supportsWorkflows && !action.isTool)
            .map(([actionName]) => toHeadingKey(actionName))
        );
        const wronglyMarked = fs
          .readFileSync(docsPagePath, 'utf8')
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.endsWith(NOT_YET_AVAILABLE_MARKER))
          .map((line) => line.slice(0, -NOT_YET_AVAILABLE_MARKER.length).trim())
          .filter((heading) => !unavailableActionKeys.has(toHeadingKey(heading)));

        expect(wronglyMarked).toEqual([]);
      }
    );

    it.each(allSpecs)('%s docs page avoids internal vocabulary', (_exportName, spec) => {
      const docsPagePath = getDocsPagePath(spec);
      if (docsPagePath === undefined || !fs.existsSync(docsPagePath)) {
        return;
      }
      const matches = fs.readFileSync(docsPagePath, 'utf8').match(INTERNAL_VOCABULARY) ?? [];
      expect(matches).toEqual([]);
    });

    it('links only to existing pages from toc.yml and the connectors list snippet', () => {
      const linkedDocs = [
        ...getLinkedDocs(
          path.join(DOCS_DIR, 'toc.yml'),
          /file:\s*(connectors-kibana\/[^\s#]+\.md)/g,
          DOCS_DIR
        ),
        ...getLinkedDocs(
          CONNECTORS_LIST_SNIPPET,
          /\]\(\/reference\/(connectors-kibana\/[^)#\s]+\.md)/g,
          DOCS_DIR
        ),
      ];
      const missing = linkedDocs
        .filter((linkedDoc) => !fs.existsSync(linkedDoc))
        .map((linkedDoc) => path.relative(REPO_ROOT, linkedDoc));

      expect(missing).toEqual([]);
    });
  });

  describe('LLM-facing descriptions', () => {
    it.each(allSpecs)('%s describes every tool action', (_exportName, spec) => {
      const undescribed = Object.entries(spec.actions)
        .filter(([, action]) => action.isTool && !action.description?.trim())
        .map(([actionName]) => actionName);

      expect(undescribed).toEqual([]);
    });

    it.each(allSpecs)('%s describes every action input parameter', (_exportName, spec) => {
      expect(getInputViolations(spec).undescribedParams).toEqual([]);
    });
  });

  describe('input bounds', () => {
    it.each(allSpecs)('%s bounds every action input string', (_exportName, spec) => {
      expect(getInputViolations(spec).unboundedStrings).toEqual([]);
    });

    it.each(allSpecs)('%s bounds every action input array', (_exportName, spec) => {
      expect(getInputViolations(spec).unboundedArrays).toEqual([]);
    });
  });

  describe('input schema walker', () => {
    it('reports unbounded, undescribed, nested, record, and union fields', () => {
      const schema = z.object({
        bounded: z.string().max(10).describe('bounded'),
        choice: z.enum(['a', 'b']).describe('enum'),
        free: z.string(),
        tags: z.array(z.string().max(5)).describe('tags'),
        nested: z.object({ id: z.string().max(5) }).describe('nested'),
        labels: z.record(z.string(), z.string().max(5)).describe('labels'),
        either: z.union([z.string(), z.number()]).describe('either'),
        preprocessed: z
          .preprocess((value) => (value === '' ? undefined : value), z.string().optional())
          .default('primary')
          .describe('preprocessed'),
      });

      expect(collectInputViolations(schema, 'action')).toEqual({
        unboundedStrings: [
          'action.free',
          'action.labels{key}',
          'action.either.anyOf[0]',
          'action.preprocessed',
        ],
        unboundedArrays: ['action.tags'],
        undescribedParams: ['action.free', 'action.nested.id'],
      });
    });

    it('follows $ref into shared and recursive definitions', () => {
      const shared = z.object({ code: z.string() }).meta({ id: 'QualityContractSharedRef' });
      const node = z.object({
        name: z.string(),
        get children() {
          return z.array(node).describe('children');
        },
      });
      const schema = z.object({
        first: shared.describe('first'),
        second: shared.describe('second'),
        tree: node.describe('tree'),
      });

      expect(collectInputViolations(schema, 'action')).toEqual({
        unboundedStrings: [
          'action.first.code',
          'action.second.code',
          'action.tree.name',
          'action.tree.children[].name',
        ],
        unboundedArrays: ['action.tree.children'],
        undescribedParams: [
          'action.first.code',
          'action.second.code',
          'action.tree.name',
          'action.tree.children[].name',
        ],
      });
    });
  });

  describe('workflow use claim matcher', () => {
    it.each([
      'Workflow steps only.',
      'so the calling agent turn or workflow step does not time out',
      'This action is workflow-only.',
      'Call it from a workflow.',
    ])('matches %s', (text) => {
      expect(text.match(WORKFLOW_USE_CLAIM)).not.toBeNull();
    });

    it('does not match the planned-support note', () => {
      expect(
        'This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release.'.match(
          WORKFLOW_USE_CLAIM
        )
      ).toBeNull();
    });
  });
});
