/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import type { DataReferenceItem } from './build_data_reference_catalog';
import {
  buildDataReferenceCatalog,
  flattenDataReferenceLeaves,
  formatDataReferenceToken,
  isDataReferenceDraggable,
  isDataReferenceEntity,
  isDataReferenceExpandable,
  isDataReferenceInsertable,
  overlayValueSample,
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

  it('scopes steps to document-order predecessors; empty on the first step', () => {
    const early = buildDataReferenceCatalog({
      definition,
      currentStepName: 'first',
      connectors: [],
    });
    const earlySteps = early.groups.find((g) => g.id === 'steps');
    expect(earlySteps?.items).toEqual([]);
    expect(earlySteps?.emptyMessage).toMatch(/No earlier steps/);

    const late = buildDataReferenceCatalog({
      definition,
      currentStepName: 'second',
      connectors: [],
    });
    const stepsGroup = late.groups.find((g) => g.id === 'steps');
    expect(stepsGroup?.items).toHaveLength(1);
    expect(stepsGroup?.items[0]).toMatchObject({
      path: 'steps.first.output',
      label: 'first',
      isEntity: true,
      drillable: true,
    });
    expect(isDataReferenceInsertable(stepsGroup!.items[0])).toBe(false);
    expect(isDataReferenceExpandable(stepsGroup!.items[0])).toBe(true);
    expect(isDataReferenceDraggable(stepsGroup!.items[0])).toBe(false);
    // Untyped / opaque outputs: one insertable object leaf under the entity.
    expect(stepsGroup?.items[0].children?.[0]).toMatchObject({
      path: 'steps.first.output',
      typeLabel: 'object',
      drillable: false,
      note: expect.stringMatching(/does not declare output fields/),
    });
    expect(isDataReferenceDraggable(stepsGroup!.items[0].children![0])).toBe(true);
    expect(isDataReferenceInsertable(stepsGroup!.items[0].children![0])).toBe(true);
  });

  it('includes every step when stepsScope is allSteps', () => {
    const catalog = buildDataReferenceCatalog({
      definition,
      currentStepName: 'first',
      connectors: [],
      stepsScope: 'allSteps',
    });
    const stepsGroup = catalog.groups.find((g) => g.id === 'steps');
    expect(stepsGroup?.items.map((i) => i.label)).toEqual(['first', 'second']);
    expect(stepsGroup?.description).toMatch(/evaluated after the run finishes/);
  });

  it('nests consts under Workflow context as a consts parent', () => {
    const catalog = buildDataReferenceCatalog({
      definition,
      currentStepName: 'second',
      connectors: [],
    });
    expect(catalog.groups.map((g) => g.id)).toEqual(['triggers', 'steps', 'context']);

    const context = catalog.groups.find((g) => g.id === 'context');
    const constsParent = context?.items.find((i) => i.path === 'consts');
    expect(constsParent).toMatchObject({
      label: 'consts',
      typeLabel: 'object',
      drillable: true,
    });
    expect(isDataReferenceInsertable(constsParent!)).toBe(false);
    expect(isDataReferenceDraggable(constsParent!)).toBe(false);

    const region = constsParent?.children?.find((i) => i.path === 'consts.region');
    expect(region).toMatchObject({
      label: 'region',
      subtitle: 'us-east-1',
      typeLabel: 'string',
      originLabel: 'Workflow context',
    });
    expect(isDataReferenceDraggable(region!)).toBe(true);

    expect(context?.items.find((i) => i.path === 'kibanaUrl')).toMatchObject({
      label: 'kibanaUrl',
      typeLabel: 'string',
    });
    expect(context?.items.find((i) => i.path === 'kibanaUrl')?.subtitle).toBeUndefined();

    const workflow = context?.items.find((i) => i.path === 'workflow');
    expect(workflow?.drillable).toBe(true);
    expect(isDataReferenceInsertable(workflow!)).toBe(false);
    expect(isDataReferenceDraggable(workflow!)).toBe(false);
    const workflowId = workflow?.children?.find((c) => c.path === 'workflow.id');
    expect(isDataReferenceDraggable(workflowId!)).toBe(true);
  });

  it('skips the trigger entity row when there is only one trigger', () => {
    const catalog = buildDataReferenceCatalog({
      definition,
      currentStepName: 'second',
      connectors: [],
    });
    const triggers = catalog.groups.find((g) => g.id === 'triggers');
    expect(triggers?.title).toBe('Trigger event');
    expect(triggers?.items.every((i) => !isDataReferenceEntity(i))).toBe(true);
    expect(triggers?.items.some((i) => i.path.startsWith('event'))).toBe(true);
  });

  it('uses entity rows per trigger when multiple are configured', () => {
    const multi = {
      ...definition,
      triggers: [{ type: 'manual' }, { type: 'alert' }],
    } as unknown as WorkflowYaml;
    const catalog = buildDataReferenceCatalog({
      definition: multi,
      currentStepName: 'second',
      connectors: [],
    });
    const triggers = catalog.groups.find((g) => g.id === 'triggers');
    expect(triggers?.title).toBe('Triggers');
    expect(triggers?.description).toMatch(/Each trigger exposes different fields/);
    expect(triggers?.items).toHaveLength(2);
    expect(triggers?.items.every(isDataReferenceEntity)).toBe(true);
    expect(triggers?.items.map((i) => i.label)).toEqual(['Manual', 'Alert']);
    // Trigger blurbs belong in the group (i) tooltip — not on each row.
    expect(triggers?.items.every((i) => i.subtitle === undefined)).toBe(true);
  });

  it('shows a step action-type subtitle only when it differs from the step name', () => {
    const mixed = {
      ...definition,
      steps: [
        { name: 'if_step', type: 'if' },
        { name: 'SendHashtoVT', type: '.virustotal' },
        { name: 'after', type: 'console', with: { message: 'y' } },
      ],
    } as unknown as WorkflowYaml;
    const catalog = buildDataReferenceCatalog({
      definition: mixed,
      currentStepName: 'after',
      connectors: [
        {
          type: '.virustotal',
          hasConnectorId: false,
          paramsSchema: {},
          outputSchema: {},
          summary: 'Scan File Hash',
          displayName: 'Scan File Hash',
        } as never,
      ],
    });
    const steps = catalog.groups.find((g) => g.id === 'steps')?.items ?? [];
    const ifStep = steps.find((i) => i.label === 'if_step');
    const hashStep = steps.find((i) => i.label === 'SendHashtoVT');
    expect(ifStep?.subtitle).toBeUndefined();
    expect(hashStep?.subtitle).toBe('Scan File Hash');
  });

  it('formats Liquid tokens with single spaces', () => {
    expect(formatDataReferenceToken('steps.a.output')).toBe('{{ steps.a.output }}');
  });

  it('flattens leaves for search across groups including undrilled entities', () => {
    const catalog = buildDataReferenceCatalog({
      definition,
      currentStepName: 'second',
      connectors: [],
    });
    const leaves = flattenDataReferenceLeaves(catalog);
    expect(leaves.some((l) => l.path === 'consts.region')).toBe(true);
    expect(leaves.some((l) => l.path === 'steps.first.output')).toBe(true);
    expect(leaves.every((l) => l.originLabel)).toBe(true);
    expect(leaves.every(isDataReferenceInsertable)).toBe(true);
  });
});

describe('overlayValueSample', () => {
  const originLabel = 'Step · first';
  const leaf = (path: string, typeLabel = 'string'): DataReferenceItem => ({
    path,
    label: path.slice(path.lastIndexOf('.') + 1),
    typeLabel,
    drillable: false,
    originLabel,
  });
  const entity = (children: readonly DataReferenceItem[]): DataReferenceItem => ({
    path: 'steps.first.output',
    label: 'first',
    typeLabel: 'object',
    drillable: true,
    isEntity: true,
    stepName: 'first',
    originLabel,
    children,
  });

  it('records the step name on step entities', () => {
    const catalog = buildDataReferenceCatalog({
      definition: {
        name: 'Demo',
        triggers: [{ type: 'manual' }],
        steps: [
          { name: 'first', type: 'console', with: { message: 'hi' } },
          { name: 'second', type: 'console', with: { message: 'yo' } },
        ],
      } as unknown as WorkflowYaml,
      currentStepName: 'second',
      connectors: [],
    });
    const stepItems = catalog.groups.find((group) => group.id === 'steps')?.items ?? [];
    expect(stepItems.map((item) => item.stepName)).toEqual(['first']);
  });

  it('returns the item untouched when there is no sample', () => {
    const item = entity([leaf('steps.first.output.status')]);
    expect(overlayValueSample(item, undefined)).toBe(item);
  });

  it('shows the sample value on the matching schema row', () => {
    const result = overlayValueSample(entity([leaf('steps.first.output.status')]), {
      status: 'ok',
    });
    expect(result.children).toEqual([
      expect.objectContaining({ path: 'steps.first.output.status', subtitle: 'ok' }),
    ]);
  });

  it('appends sample keys the schema does not know, recursively', () => {
    const result = overlayValueSample(entity([leaf('steps.first.output.status')]), {
      status: 'ok',
      extra: { count: 3, flag: false, nothing: null },
    });
    const extra = result.children?.find((child) => child.path === 'steps.first.output.extra');
    expect(extra).toEqual(expect.objectContaining({ typeLabel: 'object', drillable: true }));
    expect(extra?.children?.map((child) => [child.path, child.subtitle, child.typeLabel])).toEqual([
      ['steps.first.output.extra.count', '3', 'number'],
      ['steps.first.output.extra.flag', 'false', 'boolean'],
      ['steps.first.output.extra.nothing', 'null', 'null'],
    ]);
  });

  it('places the sample under the opaque output leaf of a schema-less step', () => {
    const opaque = entity([leaf('steps.first.output', 'object')]);
    const result = overlayValueSample(opaque, { a: 1 });
    expect(result.children).toHaveLength(1);
    expect(result.children?.[0].path).toBe('steps.first.output');
    expect(result.children?.[0].children?.map((child) => [child.path, child.subtitle])).toEqual([
      ['steps.first.output.a', '1'],
    ]);
  });

  it('shows a primitive output on the opaque leaf, never on the entity', () => {
    const opaque = entity([leaf('steps.first.output', 'object')]);
    const result = overlayValueSample(opaque, 'done');
    expect(result.subtitle).toBeUndefined();
    expect(result.children?.[0].subtitle).toBe('done');
  });

  it('caps array samples at 10 elements', () => {
    const result = overlayValueSample(entity([]), { items: Array.from({ length: 15 }, (_, i) => i) });
    const items = result.children?.find((child) => child.path === 'steps.first.output.items');
    expect(items?.children).toHaveLength(10);
    expect(items?.children?.[0]).toEqual(
      expect.objectContaining({ path: 'steps.first.output.items[0]', label: '[0]', subtitle: '0' })
    );
  });
});
