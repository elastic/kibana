/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { monaco } from '@kbn/monaco';
import { getStepMoveState, reorderStep } from './reorder_step';
import { createFakeMonacoModel } from '../../../../../common/mocks/monaco_model';

describe('getStepMoveState', () => {
  it('reports move capability for root steps', () => {
    const yaml = `steps:
  - name: first
    type: wait
  - name: second
    type: wait
  - name: third
    type: wait`;
    const doc = parseDocument(yaml);

    expect(getStepMoveState(doc, 'first')).toMatchObject({
      canMoveUp: false,
      canMoveDown: true,
      index: 0,
    });
    expect(getStepMoveState(doc, 'second')).toMatchObject({
      canMoveUp: true,
      canMoveDown: true,
      index: 1,
    });
    expect(getStepMoveState(doc, 'third')).toMatchObject({
      canMoveUp: true,
      canMoveDown: false,
      index: 2,
    });
  });

  it('scopes siblings to the same nested steps block', () => {
    const yaml = `steps:
  - name: outer
    type: if
    condition: true
    steps:
      - name: inner_a
        type: wait
      - name: inner_b
        type: wait
  - name: after
    type: wait`;
    const doc = parseDocument(yaml);

    expect(getStepMoveState(doc, 'inner_a')).toMatchObject({
      canMoveUp: false,
      canMoveDown: true,
      index: 0,
    });
    expect(getStepMoveState(doc, 'inner_b')).toMatchObject({
      canMoveUp: true,
      canMoveDown: false,
      index: 1,
    });
    expect(getStepMoveState(doc, 'outer')).toMatchObject({
      canMoveUp: false,
      canMoveDown: true,
      index: 0,
    });
  });
});

describe('reorderStep', () => {
  it('swaps a step with the previous sibling when moving up', () => {
    const yaml = `steps:
  - name: first
    type: wait
  - name: second
    type: wait`;
    const model = createFakeMonacoModel(yaml);
    const doc = parseDocument(yaml);

    const result = reorderStep(model as unknown as monaco.editor.ITextModel, doc, 'second', 'up');

    expect(result).toEqual({ lineStart: 2, lineEnd: 3 });
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          range: new monaco.Range(2, 1, 5, model.getLineMaxColumn(5)),
          text: `  - name: second
    type: wait
  - name: first
    type: wait`,
        },
      ],
      expect.any(Function)
    );
  });

  it('swaps a step with the next sibling when moving down', () => {
    const yaml = `steps:
  - name: first
    type: wait
  - name: second
    type: wait`;
    const model = createFakeMonacoModel(yaml);
    const doc = parseDocument(yaml);

    const result = reorderStep(model as unknown as monaco.editor.ITextModel, doc, 'first', 'down');

    expect(result).toEqual({ lineStart: 4, lineEnd: 5 });
    expect(model.pushEditOperations).toHaveBeenCalledWith(
      null,
      [
        {
          range: new monaco.Range(2, 1, 5, model.getLineMaxColumn(5)),
          text: `  - name: second
    type: wait
  - name: first
    type: wait`,
        },
      ],
      expect.any(Function)
    );
  });

  it('returns undefined when the step cannot move further', () => {
    const yaml = `steps:
  - name: only
    type: wait`;
    const model = createFakeMonacoModel(yaml);
    const doc = parseDocument(yaml);

    expect(
      reorderStep(model as unknown as monaco.editor.ITextModel, doc, 'only', 'up')
    ).toBeUndefined();
    expect(model.pushEditOperations).not.toHaveBeenCalled();
  });
});
