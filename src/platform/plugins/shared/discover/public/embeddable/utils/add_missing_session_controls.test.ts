/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import { type ESQLControlVariable, ESQLVariableType } from '@kbn/esql-types';
import { addMissingSessionControls } from './add_missing_session_controls';

const controlGroupJson = JSON.stringify({
  sessionHostControl: { type: ESQL_CONTROL, order: 0, variable_name: 'host' },
  sessionServiceControl: { type: ESQL_CONTROL, order: 1, variable_name: 'service' },
});

const createParentApi = () => {
  const childrenLoading$ = new BehaviorSubject(true);
  const esqlVariables$ = new BehaviorSubject<ESQLControlVariable[]>([]);
  return {
    childrenLoading$,
    esqlVariables$,
    addNewPanel: jest.fn(),
    setFetchPaused: jest.fn(),
    isFetchPaused$: new BehaviorSubject(false),
  };
};

describe('addMissingSessionControls', () => {
  it('waits for the parent panels to load before adding the missing controls', async () => {
    const parentApi = createParentApi();

    const done = addMissingSessionControls({ parentApi, controlGroupJson, uuid: 'panel' });
    await Promise.resolve();

    expect(parentApi.setFetchPaused).toHaveBeenCalledWith(true);
    expect(parentApi.addNewPanel).not.toHaveBeenCalled();

    // The dashboard's own control for `host` is only known once its panels have loaded
    parentApi.esqlVariables$.next([{ key: 'host', value: 'a', type: ESQLVariableType.VALUES }]);
    parentApi.childrenLoading$.next(false);
    await done;

    expect(parentApi.addNewPanel).toHaveBeenCalledTimes(1);
    expect(parentApi.addNewPanel).toHaveBeenCalledWith(
      {
        panelType: ESQL_CONTROL,
        serializedState: { type: ESQL_CONTROL, variable_name: 'service' },
      },
      { beside: 'panel', scrollToPanel: false }
    );
    expect(parentApi.setFetchPaused).toHaveBeenLastCalledWith(false);
  });

  it('adds the missing controls right away when the parent does not publish loading state', async () => {
    const { childrenLoading$, ...parentApi } = createParentApi();

    await addMissingSessionControls({ parentApi, controlGroupJson, uuid: 'panel' });

    expect(parentApi.addNewPanel).toHaveBeenCalledTimes(2);
  });

  it('does nothing without session controls', async () => {
    const parentApi = createParentApi();

    await addMissingSessionControls({ parentApi, controlGroupJson: undefined, uuid: 'panel' });

    expect(parentApi.setFetchPaused).not.toHaveBeenCalled();
    expect(parentApi.addNewPanel).not.toHaveBeenCalled();
  });
});
