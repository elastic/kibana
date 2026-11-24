/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OasdiffEntry } from '@kbn/api-contracts';
import type { StepContract } from './step_contracts';
import {
  buildStepContractsOpenApi,
  compareStepContracts,
  formatStepContractsReport,
  getAddedAllowlistEntries,
  parseApprovedSteps,
  parseStepContractsAllowlist,
  type StepContractsAllowlistEntry,
} from './step_contracts_compat';

const createContract = (id: string, overrides: Partial<StepContract> = {}): StepContract => ({
  id,
  stability: 'stable',
  exposure: 'open',
  input: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  output: { type: 'object', properties: { total: { type: 'number' } }, required: ['total'] },
  ...overrides,
});

const createEntry = (stepId: string, id: string, level: number): OasdiffEntry => ({
  id,
  text: `${id} in ${stepId}`,
  level,
  operation: 'POST',
  path: `/${stepId}`,
  source: '/tmp/head.json',
});

describe('buildStepContractsOpenApi', () => {
  it('wraps each step in an operation with its input and config as the request and its output as the response', () => {
    const contract = createContract('ns.step', { config: { type: 'object' } });

    expect(buildStepContractsOpenApi([contract])).toEqual({
      openapi: '3.0.3',
      info: { title: 'Workflow step contracts', version: '1' },
      paths: {
        '/ns.step': {
          post: {
            operationId: 'ns.step',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { with: contract.input, config: { type: 'object' } },
                    required: ['with', 'config'],
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'The step output',
                content: { 'application/json': { schema: contract.output } },
              },
            },
          },
        },
      },
      components: { schemas: {} },
    });
  });

  it('keeps recursive definitions as components, named per step and section', () => {
    const contract = createContract('ns.step', {
      output: {
        type: 'object',
        properties: { tree: { allOf: [{ $ref: '#/definitions/__schema3' }] } },
        definitions: {
          __schema3: {
            type: 'object',
            properties: { children: { type: 'array', items: { $ref: '#/definitions/__schema3' } } },
          },
        },
      },
    });

    const document = buildStepContractsOpenApi([contract]);

    expect(document.components).toEqual({
      schemas: {
        'ns.step.output.recursive0': {
          type: 'object',
          properties: {
            children: {
              type: 'array',
              items: { $ref: '#/components/schemas/ns.step.output.recursive0' },
            },
          },
        },
      },
    });
    // The single-member allOf is merged, so oasdiff compares the reference by content.
    expect(JSON.stringify(document.paths)).toContain(
      '"tree":{"$ref":"#/components/schemas/ns.step.output.recursive0"}'
    );
    expect(JSON.stringify(document.paths)).not.toContain('definitions');
  });

  it('inlines the other definitions, so renumbering them gives the same document', () => {
    const address = { type: 'object', properties: { city: { type: 'string' } } };
    const name = { type: 'string', maxLength: 10 };
    const numbered = (addressName: string, nameName: string) =>
      createContract('ns.step', {
        input: {
          type: 'object',
          properties: {
            from: { allOf: [{ $ref: `#/definitions/${addressName}` }], description: 'From' },
            to: { $ref: `#/definitions/${addressName}` },
            label: { $ref: `#/definitions/${nameName}` },
          },
          definitions: { [addressName]: address, [nameName]: name },
        },
      });

    const document = buildStepContractsOpenApi([numbered('__schema0', '__schema1')]);

    expect(buildStepContractsOpenApi([numbered('__schema1', '__schema0')])).toEqual(document);
    expect(document.components).toEqual({ schemas: {} });
    expect(JSON.stringify(document.paths)).toContain(
      JSON.stringify({
        from: { ...address, description: 'From' },
        to: address,
        label: name,
      })
    );
  });

  it('titles the variants of a discriminated union, so oasdiff can pair them', () => {
    const variant = (kind: string, extra = {}) => ({
      type: 'object',
      properties: { kind: { type: 'string', enum: [kind] }, size: { type: 'number' } },
      ...extra,
    });
    const contract = createContract('ns.step', {
      output: {
        oneOf: [variant('a'), variant('b', { title: 'Kept' })],
        properties: { other: { anyOf: [{ type: 'string' }, { type: 'number' }] } },
      },
    });

    const serialized = JSON.stringify(buildStepContractsOpenApi([contract]).paths);

    expect(serialized).toContain(
      JSON.stringify({
        oneOf: [
          { ...variant('a'), title: 'kind=a' },
          { ...variant('b'), title: 'Kept' },
        ],
      }).slice(1, -1)
    );
    // Without a discriminator, the members keep no title.
    expect(serialized).toContain('"anyOf":[{"type":"string"},{"type":"number"}]');
  });

  it('keeps an allOf whose member constrains the same keyword as its parent', () => {
    const member = { type: 'object', properties: { a: { type: 'string' } } };
    const contract = createContract('ns.step', {
      input: { allOf: [member], properties: { b: { type: 'string' } } },
    });

    expect(JSON.stringify(buildStepContractsOpenApi([contract]).paths)).toContain(
      JSON.stringify({ allOf: [member], properties: { b: { type: 'string' } } })
    );
  });

  it('drops the keywords OpenAPI does not define, but keeps properties named like keywords', () => {
    const contract = createContract('ns.step', {
      input: {
        type: 'object',
        jsonSchemaModel: true,
        properties: {
          $ref: { type: 'string', jsonSchemaModel: true },
          anyOf: { type: 'array', items: { type: 'string', 'x-kept': true, custom: 1 } },
        },
      },
    });

    const document = buildStepContractsOpenApi([contract]);

    expect(JSON.stringify(document.paths)).toContain(
      JSON.stringify({
        type: 'object',
        properties: {
          $ref: { type: 'string' },
          anyOf: { type: 'array', items: { type: 'string', 'x-kept': true } },
        },
      })
    );
  });
});

describe('compareStepContracts', () => {
  const compare = ({
    base,
    head,
    // Every step is approved unless a test says otherwise.
    approvedSteps = [...base, ...head].map(({ id }) => id),
    entries = [],
    allowlist = [],
  }: {
    base: StepContract[];
    head: StepContract[];
    approvedSteps?: string[];
    entries?: OasdiffEntry[];
    allowlist?: StepContractsAllowlistEntry[];
  }) => {
    const runOpenApiDiff = jest.fn().mockReturnValue(entries);
    return {
      ...compareStepContracts({ base, head, approvedSteps, allowlist, runOpenApiDiff }),
      runOpenApiDiff,
    };
  };

  it('lists the steps that are not approved, new or not', () => {
    const { unapprovedSteps, changes } = compare({
      base: [createContract('ns.existing'), createContract('ns.approved')],
      head: [
        createContract('ns.existing'),
        createContract('ns.approved'),
        createContract('ns.new'),
      ],
      approvedSteps: ['ns.approved', 'ns.removed'],
    });

    expect(unapprovedSteps).toEqual(['ns.existing', 'ns.new']);
    expect(changes).toEqual([]);
  });

  it('reports nothing, and does not run oasdiff, when no contract changed', () => {
    const contracts = [createContract('ns.a'), createContract('ns.b')];

    const { changes, addedSteps, runOpenApiDiff } = compare({ base: contracts, head: contracts });

    expect(changes).toEqual([]);
    expect(addedSteps).toEqual([]);
    expect(runOpenApiDiff).not.toHaveBeenCalled();
  });

  it('lists the new steps without reporting them as changes', () => {
    const { changes, addedSteps } = compare({
      base: [createContract('ns.a')],
      head: [createContract('ns.a'), createContract('ns.new')],
    });

    expect(changes).toEqual([]);
    expect(addedSteps).toEqual(['ns.new']);
  });

  it('fails on a removed step', () => {
    const { changes } = compare({ base: [createContract('ns.a')], head: [] });

    expect(changes).toEqual([
      expect.objectContaining({ stepId: 'ns.a', rule: 'step-removed', disposition: 'blocking' }),
    ]);
  });

  it('fails when the exposure narrows to managed_only, and only reports a narrowing to internal', () => {
    const { changes, runOpenApiDiff } = compare({
      base: [createContract('ns.a'), createContract('ns.b')],
      head: [
        createContract('ns.a', { exposure: 'managed_only' }),
        createContract('ns.b', { exposure: 'internal' }),
      ],
    });

    // The schemas didn't change, so oasdiff isn't needed.
    expect(runOpenApiDiff).not.toHaveBeenCalled();

    expect(changes).toEqual([
      expect.objectContaining({
        stepId: 'ns.a',
        rule: 'step-exposure-narrowed',
        disposition: 'blocking',
      }),
      expect.objectContaining({
        stepId: 'ns.b',
        rule: 'step-exposure-narrowed',
        disposition: 'report_only',
      }),
    ]);
  });

  it('does not report a wider exposure', () => {
    const { changes } = compare({
      base: [createContract('ns.a', { exposure: 'managed_only' })],
      head: [createContract('ns.a', { exposure: 'open' })],
    });

    expect(changes).toEqual([]);
  });

  it('passes only the changed contracts to oasdiff', () => {
    const changed = createContract('ns.changed', { output: { type: 'object' } });

    const { runOpenApiDiff } = compare({
      base: [createContract('ns.same'), createContract('ns.changed')],
      head: [createContract('ns.same'), changed],
    });

    expect(runOpenApiDiff).toHaveBeenCalledTimes(1);
    const [baseDocument, headDocument] = runOpenApiDiff.mock.calls[0];
    expect(Object.keys(baseDocument.paths)).toEqual(['/ns.changed']);
    expect(Object.keys(headDocument.paths)).toEqual(['/ns.changed']);
  });

  it('applies the oasdiff levels and Kibana rule policy to schema changes', () => {
    const { changes } = compare({
      base: [createContract('ns.a')],
      head: [createContract('ns.a', { output: { type: 'object' } })],
      entries: [
        createEntry('ns.a', 'response-required-property-removed', 3),
        createEntry('ns.a', 'response-property-enum-value-added', 2),
        createEntry('ns.a', 'request-property-max-length-increased', 1),
      ],
    });

    expect(changes).toEqual([
      expect.objectContaining({
        stepId: 'ns.a',
        rule: 'response-required-property-removed',
        description: 'response-required-property-removed in ns.a',
        disposition: 'blocking',
      }),
      expect.objectContaining({
        stepId: 'ns.a',
        rule: 'response-property-enum-value-added',
        disposition: 'report_only',
      }),
    ]);
  });

  it('accepts the breaking changes that an allowlist entry matches', () => {
    const { changes } = compare({
      base: [createContract('ns.a'), createContract('ns.b'), createContract('ns.c')],
      head: [createContract('ns.c')],
      allowlist: [
        { stepId: 'ns.a', rule: 'step-removed', reason: 'Replaced by ns.c' },
        { stepId: 'ns.b', reason: 'Never released' },
      ],
    });

    expect(changes).toEqual([
      expect.objectContaining({
        stepId: 'ns.a',
        disposition: 'allowlisted',
        note: 'Replaced by ns.c',
      }),
      expect.objectContaining({
        stepId: 'ns.b',
        disposition: 'allowlisted',
        note: 'Never released',
      }),
    ]);
  });

  it('does not accept a breaking change that an allowlist entry for another rule names', () => {
    const { changes } = compare({
      base: [createContract('ns.a')],
      head: [],
      allowlist: [{ stepId: 'ns.a', rule: 'response-required-property-removed', reason: 'reason' }],
    });

    expect(changes).toEqual([expect.objectContaining({ disposition: 'blocking' })]);
  });
});

describe('parseApprovedSteps', () => {
  it('returns the step ids', () => {
    expect(parseApprovedSteps({ steps: ['ns.a', 'ns.b'] }, 'source')).toEqual(['ns.a', 'ns.b']);
  });

  it('throws when the steps are not a list of ids', () => {
    expect(() => parseApprovedSteps({ steps: [{ id: 'ns.a' }] }, 'source')).toThrow(
      'source is not an approved steps file'
    );
  });
});

describe('allowlist', () => {
  it('parses the entries', () => {
    expect(
      parseStepContractsAllowlist(
        {
          entries: [
            { stepId: 'ns.a', rule: 'step-removed', reason: 'reason' },
            { stepId: 'ns.b', reason: 'reason' },
          ],
        },
        'source'
      )
    ).toEqual([
      { stepId: 'ns.a', rule: 'step-removed', reason: 'reason' },
      { stepId: 'ns.b', reason: 'reason' },
    ]);
  });

  it('throws on an entry without a reason', () => {
    expect(() => parseStepContractsAllowlist({ entries: [{ stepId: 'ns.a' }] }, 'source')).toThrow(
      'source: entry 0 needs a string "stepId" and "reason"'
    );
  });

  it('applies only the entries added since the base', () => {
    const existing = { stepId: 'ns.a', rule: 'step-removed', reason: 'Old change' };
    const added = { stepId: 'ns.a', reason: 'New change' };

    expect(getAddedAllowlistEntries([existing], [existing, added])).toEqual([added]);
  });
});

describe('formatStepContractsReport', () => {
  const options = {
    approvedStepsPath: 'contracts/approved_steps.json',
    allowlistPath: 'contracts/allowlist.json',
    docsLink: 'https://docs',
  };

  it('lists the steps that need approval', () => {
    const report = formatStepContractsReport(
      { addedSteps: ['ns.new'], unapprovedSteps: ['ns.new'], changes: [] },
      options
    );

    expect(report).toContain('**1 step(s) need workflows-eng approval:** `ns.new`.');
    expect(report).toContain('Add them to `contracts/approved_steps.json`');
  });

  it('lists the breaking changes, the reported ones and the new steps', () => {
    const report = formatStepContractsReport(
      {
        addedSteps: ['ns.new'],
        unapprovedSteps: [],
        changes: [
          {
            stepId: 'ns.a',
            rule: 'step-removed',
            description: 'Removed | gone',
            disposition: 'blocking',
          },
          {
            stepId: 'ns.b',
            rule: 'step-exposure-narrowed',
            description: 'Narrowed',
            disposition: 'report_only',
            note: 'Keeps working',
          },
        ],
      },
      options
    );

    expect(report).toContain('This PR makes 1 breaking change(s) to workflow step contracts.');
    expect(report).toContain('`contracts/allowlist.json`');
    expect(report).toContain('| `ns.a` | Removed \\| gone | `step-removed` |');
    expect(report).toContain('| `ns.b` | Narrowed | `step-exposure-narrowed` | Keeps working |');
    expect(report).toContain('New steps: `ns.new`');
  });

  it('says when there is nothing to report', () => {
    expect(
      formatStepContractsReport({ addedSteps: [], unapprovedSteps: [], changes: [] }, options)
    ).toContain('No breaking changes.');
  });
});
