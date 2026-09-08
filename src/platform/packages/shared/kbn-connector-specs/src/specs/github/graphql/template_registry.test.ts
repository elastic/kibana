/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosResponse } from 'axios';
import type { ActionContext } from '../../../connector_spec';
import { GITHUB_QUERY_TEMPLATES } from './catalog';
import {
  getTemplate,
  listTemplates,
  registerConnectorQueryTemplates,
  unregisterConnectorQueryTemplates,
  listRegisteredConnectorTemplates,
  MAX_TEMPLATE_DOCUMENT_LENGTH,
} from './template_registry';
import { executeRunQueryTemplate } from './github_graphql_client';

const PKG = 'sdlc_intel';

const validDefinition = {
  id: 'myTeamRoadmap',
  description: 'Team roadmap items for an org project.',
  resultPath: 'organization.projectV2.items',
  isPaginated: true,
  variables: [{ name: 'org', type: 'string' as const, required: true }],
  document: `
    query MyTeamRoadmap($org: String!, $first: Int!, $after: String) {
      rateLimit { cost limit remaining resetAt }
      organization(login: $org) {
        projectV2(number: 1) {
          items(first: $first, after: $after) {
            pageInfo { hasNextPage endCursor }
            nodes { id }
          }
        }
      }
    }
  `,
};

const makeContext = (mockPost: jest.Mock): ActionContext =>
  ({
    client: { post: mockPost },
    config: { graphqlApiUrl: 'https://api.github.com/graphql' },
    log: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext);

afterEach(() => {
  unregisterConnectorQueryTemplates(PKG);
  unregisterConnectorQueryTemplates('other_pkg');
});

describe('CONN-006 · package-shippable connector query templates', () => {
  describe('registration', () => {
    it('registers a package template and makes it retrievable via getTemplate', () => {
      const result = registerConnectorQueryTemplates({
        packageName: PKG,
        templates: [validDefinition],
      });

      expect(result.registered).toEqual(['sdlc_intel.myTeamRoadmap']);
      expect(result.errors).toEqual([]);

      const template = getTemplate('sdlc_intel.myTeamRoadmap');
      expect(template.id).toBe('sdlc_intel.myTeamRoadmap');
      expect(template.isPaginated).toBe(true);
      expect(template.resultPath).toBe('organization.projectV2.items');
    });

    it('namespaces the template id under the package name', () => {
      registerConnectorQueryTemplates({ packageName: PKG, templates: [validDefinition] });

      // the bare (un-namespaced) id must NOT be resolvable
      expect(() => getTemplate('myTeamRoadmap')).toThrow(/Unknown GitHub GraphQL template/);
    });

    it('accepts an already-namespaced id without double-prefixing', () => {
      const result = registerConnectorQueryTemplates({
        packageName: PKG,
        templates: [{ ...validDefinition, id: 'sdlc_intel.alreadyNamespaced' }],
      });

      expect(result.registered).toEqual(['sdlc_intel.alreadyNamespaced']);
      expect(getTemplate('sdlc_intel.alreadyNamespaced')).toBeDefined();
    });

    it('surfaces registered templates in listTemplates alongside core templates', () => {
      registerConnectorQueryTemplates({ packageName: PKG, templates: [validDefinition] });

      const ids = listTemplates().map((t) => t.id);
      expect(ids).toContain('sdlc_intel.myTeamRoadmap');
      // core templates still listed
      expect(ids).toContain('orgCatalog.repos');
    });

    it('reports registered templates with their owning package', () => {
      registerConnectorQueryTemplates({ packageName: PKG, templates: [validDefinition] });

      expect(listRegisteredConnectorTemplates()).toEqual([
        { id: 'sdlc_intel.myTeamRoadmap', packageName: PKG },
      ]);
    });

    it('is idempotent across repeated installs of the same package', () => {
      registerConnectorQueryTemplates({ packageName: PKG, templates: [validDefinition] });
      const second = registerConnectorQueryTemplates({
        packageName: PKG,
        templates: [validDefinition],
      });

      expect(second.errors).toEqual([]);
      expect(listRegisteredConnectorTemplates()).toHaveLength(1);
    });

    it('removes a package\u2019s templates on uninstall', () => {
      registerConnectorQueryTemplates({ packageName: PKG, templates: [validDefinition] });
      const removed = unregisterConnectorQueryTemplates(PKG);

      expect(removed).toEqual(['sdlc_intel.myTeamRoadmap']);
      expect(() => getTemplate('sdlc_intel.myTeamRoadmap')).toThrow();
      expect(listRegisteredConnectorTemplates()).toEqual([]);
    });

    it('requires a package name', () => {
      expect(() =>
        registerConnectorQueryTemplates({ packageName: '  ', templates: [validDefinition] })
      ).toThrow(/packageName is required/);
    });
  });

  describe('read-only sandbox', () => {
    it.each([
      [
        'mutation',
        'mutation Evil($org: String!) { addStar(input: { starrableId: $org }) { clientMutationId } }',
        /must contain exactly one `query` operation|mutation/i,
      ],
      [
        'subscription',
        'subscription Evil { issueEvent { id } }',
        /must contain exactly one `query` operation|subscription/i,
      ],
    ])('rejects a %s document', (_label, document, expected) => {
      const result = registerConnectorQueryTemplates({
        packageName: PKG,
        templates: [{ ...validDefinition, document }],
      });

      expect(result.registered).toEqual([]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toMatch(expected);
      expect(() => getTemplate('sdlc_intel.myTeamRoadmap')).toThrow();
    });

    it('rejects a document smuggling a mutation alongside a query', () => {
      const document = `
        query Ok { rateLimit { cost } }
        mutation Sneaky { addStar(input: { starrableId: "x" }) { clientMutationId } }
      `;
      const result = registerConnectorQueryTemplates({
        packageName: PKG,
        templates: [{ ...validDefinition, document }],
      });

      expect(result.registered).toEqual([]);
      expect(result.errors[0].reason).toMatch(/exactly one `query` operation/);
    });

    it('rejects a syntactically invalid document', () => {
      const result = registerConnectorQueryTemplates({
        packageName: PKG,
        templates: [{ ...validDefinition, document: 'query Broken { unclosed ' }],
      });

      expect(result.registered).toEqual([]);
      expect(result.errors[0].reason).toMatch(/not valid GraphQL/i);
    });

    it('rejects a document exceeding the size cap', () => {
      const filler = 'a'.repeat(MAX_TEMPLATE_DOCUMENT_LENGTH + 1);
      const result = registerConnectorQueryTemplates({
        packageName: PKG,
        templates: [{ ...validDefinition, document: `query Big { ${filler} }` }],
      });

      expect(result.registered).toEqual([]);
      expect(result.errors[0].reason).toMatch(/exceeds the maximum/i);
    });

    it('rejects a paginated template missing pagination variables', () => {
      const document = `
        query NoPaging($org: String!) {
          organization(login: $org) { projectV2(number: 1) { items { nodes { id } } } }
        }
      `;
      const result = registerConnectorQueryTemplates({
        packageName: PKG,
        templates: [{ ...validDefinition, document }],
      });

      expect(result.registered).toEqual([]);
      expect(result.errors[0].reason).toMatch(/\$first.*\$after|pagination/i);
    });
  });

  describe('core-template protection', () => {
    it('refuses to clobber a core template id', () => {
      const coreId = GITHUB_QUERY_TEMPLATES[0].id;
      const result = registerConnectorQueryTemplates({
        packageName: PKG,
        templates: [{ ...validDefinition, id: coreId }],
      });

      expect(result.registered).toEqual([]);
      expect(result.errors[0].reason).toMatch(/reserved|core template/i);

      // the core template is untouched
      expect(getTemplate(coreId)).toBe(GITHUB_QUERY_TEMPLATES[0]);
    });

    it('refuses to clobber a template owned by another package', () => {
      registerConnectorQueryTemplates({ packageName: PKG, templates: [validDefinition] });

      const result = registerConnectorQueryTemplates({
        packageName: 'other_pkg',
        templates: [{ ...validDefinition, id: 'sdlc_intel.myTeamRoadmap' }],
      });

      expect(result.registered).toEqual([]);
      expect(result.errors[0].reason).toMatch(/already registered by package/i);
    });

    it('never lets unregister remove a core template', () => {
      const before = listTemplates().filter((t) => !t.id.includes('.myTeamRoadmap')).length;
      unregisterConnectorQueryTemplates(PKG);
      expect(listTemplates()).toHaveLength(before);
    });
  });

  describe('variables schema', () => {
    it('builds a zod schema that accepts declared variables', () => {
      registerConnectorQueryTemplates({ packageName: PKG, templates: [validDefinition] });
      const template = getTemplate('sdlc_intel.myTeamRoadmap');

      expect(template.variablesSchema.safeParse({ org: 'elastic' }).success).toBe(true);
    });

    it('rejects input missing a required declared variable', () => {
      registerConnectorQueryTemplates({ packageName: PKG, templates: [validDefinition] });
      const template = getTemplate('sdlc_intel.myTeamRoadmap');

      expect(template.variablesSchema.safeParse({}).success).toBe(false);
    });

    it('allows optional variables to be omitted', () => {
      registerConnectorQueryTemplates({
        packageName: PKG,
        templates: [
          {
            ...validDefinition,
            variables: [
              { name: 'org', type: 'string' as const, required: true },
              { name: 'since', type: 'string' as const, required: false },
            ],
          },
        ],
      });
      const template = getTemplate('sdlc_intel.myTeamRoadmap');

      expect(template.variablesSchema.safeParse({ org: 'elastic' }).success).toBe(true);
      expect(
        template.variablesSchema.safeParse({ org: 'elastic', since: '2026-01-01' }).success
      ).toBe(true);
    });

    it('enforces declared variable types', () => {
      registerConnectorQueryTemplates({
        packageName: PKG,
        templates: [
          {
            ...validDefinition,
            variables: [{ name: 'number', type: 'integer' as const, required: true }],
          },
        ],
      });
      const template = getTemplate('sdlc_intel.myTeamRoadmap');

      expect(template.variablesSchema.safeParse({ number: 7 }).success).toBe(true);
      expect(template.variablesSchema.safeParse({ number: 7.5 }).success).toBe(false);
    });
  });

  describe('end-to-end: callable with no core change', () => {
    it('executes a package-registered template through executeRunQueryTemplate', async () => {
      registerConnectorQueryTemplates({ packageName: PKG, templates: [validDefinition] });

      const mockPost = jest.fn().mockResolvedValue({
        headers: {},
        data: {
          data: {
            rateLimit: { cost: 1, limit: 5000, remaining: 4000, resetAt: '2026-01-01T00:00:00Z' },
            organization: {
              projectV2: {
                items: {
                  nodes: [{ id: 'ITEM_1' }],
                  pageInfo: { hasNextPage: false, endCursor: null },
                },
              },
            },
          },
        },
      } as unknown as AxiosResponse);

      const result = await executeRunQueryTemplate({
        ctx: makeContext(mockPost),
        template: getTemplate('sdlc_intel.myTeamRoadmap'),
        variables: { org: 'elastic', first: 10 },
      });

      expect(result.data).toEqual([{ id: 'ITEM_1' }]);
      expect(mockPost).toHaveBeenCalledTimes(1);

      // the document actually sent is the package-supplied one
      const [, body] = mockPost.mock.calls[0];
      expect(body.query).toContain('MyTeamRoadmap');
    });
  });
});
