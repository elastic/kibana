/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import YAML, { Scalar } from 'yaml';
import type { LineCounter } from 'yaml';
import { PARALLEL_MODE_REFINEMENT_MESSAGE } from '@kbn/workflows';
import { validateParallelMode } from './validate_parallel_mode';
import type { StepPropInfo } from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import { createStepInfo, createWorkflowLookup } from '../../../shared/test_utils';

const mockLineCounter: LineCounter = {
  linePos: (offset: number) => ({ line: offset + 1, col: 1 }),
  lineStarts: [],
  addNewLine(offset: number): number {
    return offset + 1;
  },
};

function createPropInfo(path: string[], value: unknown): StepPropInfo {
  const keyNode = new Scalar(path[path.length - 1]);
  keyNode.range = [0, 4, 4];
  const valueNode = new Scalar(value);
  valueNode.range = [10, 20, 20];
  return { path, keyNode, valueNode };
}

/** Parses a snippet of step YAML into the `YAMLMap` used as `stepYamlNode`. */
function stepYamlNode(yaml: string): YAML.YAMLMap<unknown, unknown> {
  const doc = YAML.parseDocument(yaml);
  if (!YAML.isMap(doc.contents)) {
    throw new Error('Test setup: expected a YAMLMap');
  }
  return doc.contents;
}

const typeProp = createPropInfo(['type'], 'parallel');
const foreachProp = createPropInfo(['foreach'], '[1,2,3]');
const branchNameProps = {
  'branches.0.name': createPropInfo(['branches', '0', 'name'], 'a'),
  'branches.1.name': createPropInfo(['branches', '1', 'name'], 'b'),
};

const withStepsBody = stepYamlNode(
  'name: bad\ntype: parallel\nsteps:\n  - name: s\n    type: console'
);
const withoutStepsBody = stepYamlNode('name: bad\ntype: parallel');

describe('validateParallelMode', () => {
  it('flags a parallel step that declares both foreach and branches', () => {
    const step = createStepInfo({
      stepId: 'bad',
      stepType: 'parallel',
      stepYamlNode: withStepsBody,
      propInfos: { type: typeProp, foreach: foreachProp, ...branchNameProps },
    });

    const results = validateParallelMode(createWorkflowLookup([step]), mockLineCounter);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(
      expect.objectContaining({
        owner: 'parallel-mode-validation',
        severity: 'error',
        message: PARALLEL_MODE_REFINEMENT_MESSAGE,
      })
    );
  });

  it('flags a parallel step with neither foreach nor branches', () => {
    const step = createStepInfo({
      stepId: 'bad',
      stepType: 'parallel',
      stepYamlNode: withoutStepsBody,
      propInfos: { type: typeProp },
    });

    const results = validateParallelMode(createWorkflowLookup([step]), mockLineCounter);

    expect(results).toHaveLength(1);
    expect(results[0].message).toBe(PARALLEL_MODE_REFINEMENT_MESSAGE);
  });

  it('flags a dynamic foreach step that is missing a steps body', () => {
    const step = createStepInfo({
      stepId: 'bad',
      stepType: 'parallel',
      stepYamlNode: withoutStepsBody,
      propInfos: { type: typeProp, foreach: foreachProp },
    });

    const results = validateParallelMode(createWorkflowLookup([step]), mockLineCounter);

    expect(results).toHaveLength(1);
  });

  it('flags a static branches step that also declares a top-level steps body', () => {
    const step = createStepInfo({
      stepId: 'bad',
      stepType: 'parallel',
      stepYamlNode: withStepsBody,
      propInfos: { type: typeProp, ...branchNameProps },
    });

    const results = validateParallelMode(createWorkflowLookup([step]), mockLineCounter);

    expect(results).toHaveLength(1);
  });

  it('accepts a valid dynamic foreach step (foreach + steps)', () => {
    const step = createStepInfo({
      stepId: 'ok',
      stepType: 'parallel',
      stepYamlNode: withStepsBody,
      propInfos: { type: typeProp, foreach: foreachProp },
    });

    const results = validateParallelMode(createWorkflowLookup([step]), mockLineCounter);

    expect(results).toEqual([]);
  });

  it('accepts a valid static branches step (branches, no steps)', () => {
    const step = createStepInfo({
      stepId: 'ok',
      stepType: 'parallel',
      stepYamlNode: withoutStepsBody,
      propInfos: { type: typeProp, ...branchNameProps },
    });

    const results = validateParallelMode(createWorkflowLookup([step]), mockLineCounter);

    expect(results).toEqual([]);
  });

  it('ignores non-parallel steps', () => {
    const step = createStepInfo({
      stepId: 'loop',
      stepType: 'foreach',
      stepYamlNode: withStepsBody,
      propInfos: { type: createPropInfo(['type'], 'foreach'), foreach: foreachProp },
    });

    const results = validateParallelMode(createWorkflowLookup([step]), mockLineCounter);

    expect(results).toEqual([]);
  });
});
