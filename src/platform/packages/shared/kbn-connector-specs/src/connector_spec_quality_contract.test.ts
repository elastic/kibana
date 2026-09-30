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
const AGENT_BUILDER_ONLY_NOTE = /\*\*Agent Builder\*\* only/i;
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

const toInputJsonSchema = (schema: z.ZodType): JsonSchema =>
  z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as JsonSchema;

interface InputSchemaViolations {
  unboundedStrings: string[];
  unboundedArrays: string[];
  undescribedParams: string[];
}

const collectInputViolations = (
  schema: JsonSchema,
  schemaPath: string,
  violations: InputSchemaViolations,
  isParam: boolean
): void => {
  if (isParam && typeof schema.description !== 'string') {
    violations.undescribedParams.push(schemaPath);
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
        collectInputViolations(property, `${schemaPath}.${name}`, violations, true);
      }
    }
  }
  if (isJsonSchema(schema.items)) {
    collectInputViolations(schema.items, `${schemaPath}[]`, violations, false);
  }
  if (isJsonSchema(schema.propertyNames)) {
    collectInputViolations(schema.propertyNames, `${schemaPath}{key}`, violations, false);
  }
  if (isJsonSchema(schema.additionalProperties)) {
    collectInputViolations(schema.additionalProperties, `${schemaPath}{value}`, violations, false);
  }
  for (const unionKey of UNION_KEYS) {
    const branches = schema[unionKey];
    if (Array.isArray(branches)) {
      branches.forEach((branch, index) => {
        if (isJsonSchema(branch)) {
          collectInputViolations(branch, `${schemaPath}.${unionKey}[${index}]`, violations, false);
        }
      });
    }
  }
};

const getInputViolations = (spec: ConnectorSpec): InputSchemaViolations => {
  const violations: InputSchemaViolations = {
    unboundedStrings: [],
    unboundedArrays: [],
    undescribedParams: [],
  };
  for (const [actionName, action] of Object.entries(spec.actions)) {
    collectInputViolations(toInputJsonSchema(action.input), actionName, violations, false);
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
      '%s docs page states Agent Builder-only availability when workflows are not supported',
      (_exportName, spec) => {
        const docsPagePath = getDocsPagePath(spec);
        const { supportedFeatureIds } = spec.metadata;
        if (
          docsPagePath === undefined ||
          !fs.existsSync(docsPagePath) ||
          supportedFeatureIds.includes('workflows') ||
          !supportedFeatureIds.includes('agentBuilder')
        ) {
          return;
        }
        expect(AGENT_BUILDER_ONLY_NOTE.test(fs.readFileSync(docsPagePath, 'utf8'))).toBe(true);
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
      const violations: InputSchemaViolations = {
        unboundedStrings: [],
        unboundedArrays: [],
        undescribedParams: [],
      };
      const schema = z.object({
        bounded: z.string().max(10).describe('bounded'),
        choice: z.enum(['a', 'b']).describe('enum'),
        free: z.string(),
        tags: z.array(z.string().max(5)).describe('tags'),
        nested: z.object({ id: z.string().max(5) }).describe('nested'),
        labels: z.record(z.string(), z.string().max(5)).describe('labels'),
        either: z.union([z.string(), z.number()]).describe('either'),
      });

      collectInputViolations(toInputJsonSchema(schema), 'action', violations, false);

      expect(violations).toEqual({
        unboundedStrings: ['action.free', 'action.labels{key}', 'action.either.anyOf[0]'],
        unboundedArrays: ['action.tags'],
        undescribedParams: ['action.free', 'action.nested.id'],
      });
    });
  });
});
