/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { makeAction } from '../mocks/helpers';
import { partitionActions } from './actions';

describe('InlineActions', () => {
  it('returns an empty array when actions is an empty array', async () => {
    const { extraActions, visibleActions } = partitionActions([], 5);

    expect(visibleActions).toEqual([]);
    expect(extraActions).toEqual([]);
  });

  it('returns only visible actions when visibleCellActions > actions.length', async () => {
    const actions = [makeAction('action-1'), makeAction('action-2'), makeAction('action-3')];
    const { extraActions, visibleActions } = partitionActions(actions, 4);

    expect(visibleActions.length).toEqual(actions.length);
    expect(extraActions).toEqual([]);
  });

  it('returns only extra actions when visibleCellActions is 1', async () => {
    const actions = [makeAction('action-1'), makeAction('action-2'), makeAction('action-3')];
    const { extraActions, visibleActions } = partitionActions(actions, 1);

    expect(visibleActions).toEqual([]);
    expect(extraActions.length).toEqual(actions.length);
  });

  it('returns only extra actions when visibleCellActions is 0', async () => {
    const actions = [makeAction('action-1'), makeAction('action-2'), makeAction('action-3')];
    const { extraActions, visibleActions } = partitionActions(actions, 0);

    expect(visibleActions).toEqual([]);
    expect(extraActions.length).toEqual(actions.length);
  });

  it('returns only extra actions when visibleCellActions is negative', async () => {
    const actions = [makeAction('action-1'), makeAction('action-2'), makeAction('action-3')];
    const { extraActions, visibleActions } = partitionActions(actions, -6);

    expect(visibleActions).toEqual([]);
    expect(extraActions.length).toEqual(actions.length);
  });

  it('returns only one visible action when visibleCellActionss 2 and action.length is 3', async () => {
    const { extraActions, visibleActions } = partitionActions(
      [makeAction('action-1'), makeAction('action-2'), makeAction('action-3')],
      2
    );

    expect(visibleActions.length).toEqual(1);
    expect(extraActions.length).toEqual(2);
  });

  it('returns two visible actions when visibleCellActions is 3 and action.length is 5', async () => {
    const { extraActions, visibleActions } = partitionActions(
      [
        makeAction('action-1'),
        makeAction('action-2'),
        makeAction('action-3'),
        makeAction('action-4'),
        makeAction('action-5'),
      ],
      3
    );
    expect(visibleActions.length).toEqual(2);
    expect(extraActions.length).toEqual(3);
  });

  it('returns three visible actions when visibleCellActions is 3 and action.length is 3', async () => {
    const { extraActions, visibleActions } = partitionActions(
      [makeAction('action-1'), makeAction('action-2'), makeAction('action-3')],
      3
    );
    expect(visibleActions.length).toEqual(3);
    expect(extraActions.length).toEqual(0);
  });
});
