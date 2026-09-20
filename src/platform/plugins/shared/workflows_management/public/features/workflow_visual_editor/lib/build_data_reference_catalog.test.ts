/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import {
  buildDataReferenceCatalog,
  flattenDataReferenceLeaves,
  formatDataReferenceToken,
} from './build_data_reference_catalog';
import { getDocumentOrderPredecessors } from './get_document_order_predecessors';

describe('getDocumentOrderPredecessors', () => {
  it('returns only earlier steps in document order', () => {
    const steps = [
      { name: 'a', type: 'console' },
      { name: 'b', type: 'http' },
      { name: 'c', type: 'console' },
    ];
    expect(getDocumentOrderPredecessors(steps, 'c').map((s) => s.name)).toEqual(['a', 'b']);
    expect(getDocumentOrderPredecessors(steps, 'a')).toEqual([]);
  });

  it('includes parents before nested children', () => {
    const steps = [
      {
        name: 'gate',
        type: 'if',
        steps: [{ name: 'then_step', type: 'console' }],
        else: [{ name: 'else_step', type: 'console' }],
      },
      { name: 'after', type: 'console' },
    ];
    expect(getDocumentOrderPredecessors(steps, 'then_step').map((s) => s.name)).toEqual(['gate']);
    expect(getDocumentOrderPredecessors(steps, 'else_step').map((s) => s.name)).toEqual([
      'gate',
      'then_step',
    ]);
  });
});

describe('buildDataReferenceCatalog', () => {
  const definition = {
    name: 'Demo',
    triggers: [{ type: 'manual' }],
    consts: { region: 'us-east-1' },
    steps: [
      { name: 'first', type: 'console', with: { message: 'hi' } },
      { name: 'second', type: 'console', with: { message: 'yo' } },
    ],
  } as unknown as WorkflowYaml;

  it('scopes steps to document-order predecessors only', () => {
    const early = buildDataReferenceCatalog({
      definition,
      currentStepName: 'first',
      connectors: [],
    });
    expect(early.groups.find((g) => g.id === 'steps')).toBeUndefined();

    const late = buildDataReferenceCatalog({
      definition,
      currentStepName: 'second',
      connectors: [],
    });
    const stepsGroup = late.groups.find((g) => g.id === 'steps');
    expect(stepsGroup?.items.map((i) => i.path)).toEqual(['steps.first.output']);
    // Untyped / opaque outputs are a single non-drillable object row.
    expect(stepsGroup?.items[0]).toMatchObject({
      path: 'steps.first.output',
      typeLabel: 'object',
      drillable: false,
    });
  });

  it('includes consts, workflow context, and trigger event', () => {
    const catalog = buildDataReferenceCatalog({
      definition,
      currentStepName: 'second',
      connectors: [],
    });
    expect(catalog.groups.map((g) => g.id)).toEqual(
      expect.arrayContaining(['event', 'steps', 'consts', 'context'])
    );
    const consts = catalog.groups.find((g) => g.id === 'consts');
    expect(consts?.items.map((i) => i.path)).toEqual(['consts.region']);
  });

  it('formats Liquid tokens with single spaces', () => {
    expect(formatDataReferenceToken('steps.a.output')).toBe('{{ steps.a.output }}');
  });

  it('flattens leaves for search across groups', () => {
    const catalog = buildDataReferenceCatalog({
      definition,
      currentStepName: 'second',
      connectors: [],
    });
    const leaves = flattenDataReferenceLeaves(catalog.groups.flatMap((g) => g.items));
    expect(leaves.some((l) => l.path === 'consts.region')).toBe(true);
    expect(leaves.some((l) => l.path === 'steps.first.output')).toBe(true);
  });
});
