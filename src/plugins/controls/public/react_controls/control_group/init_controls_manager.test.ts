/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DefaultDataControlState } from '../controls/data_controls/types';
import { DefaultControlApi } from '../controls/types';
import { initControlsManager, getLastUsedDataViewId } from './init_controls_manager';
import { ControlPanelState } from './types';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('delta'),
}));

const DEFAULT_DATA_VIEW_ID = 'myDataView';

describe('PresentationContainer api', () => {
  test('addNewPanel should add control at end of controls', async () => {
    const controlsManager = initControlsManager(
      {
        alpha: { type: 'testControl', order: 0 },
        bravo: { type: 'testControl', order: 1 },
        charlie: { type: 'testControl', order: 2 },
      },
      DEFAULT_DATA_VIEW_ID
    );
    const addNewPanelPromise = controlsManager.api.addNewPanel({
      panelType: 'testControl',
      initialState: {},
    });
    controlsManager.setControlApi('delta', {} as unknown as DefaultControlApi);
    await addNewPanelPromise;
    expect(controlsManager.controlsInOrder$.value.map((element) => element.id)).toEqual([
      'alpha',
      'bravo',
      'charlie',
      'delta',
    ]);
  });

  test('removePanel should remove control', () => {
    const controlsManager = initControlsManager(
      {
        alpha: { type: 'testControl', order: 0 },
        bravo: { type: 'testControl', order: 1 },
        charlie: { type: 'testControl', order: 2 },
      },
      DEFAULT_DATA_VIEW_ID
    );
    controlsManager.api.removePanel('bravo');
    expect(controlsManager.controlsInOrder$.value.map((element) => element.id)).toEqual([
      'alpha',
      'charlie',
    ]);
  });

  test('replacePanel should replace control', async () => {
    const controlsManager = initControlsManager(
      {
        alpha: { type: 'testControl', order: 0 },
        bravo: { type: 'testControl', order: 1 },
        charlie: { type: 'testControl', order: 2 },
      },
      DEFAULT_DATA_VIEW_ID
    );
    const replacePanelPromise = controlsManager.api.replacePanel('bravo', {
      panelType: 'testControl',
      initialState: {},
    });
    controlsManager.setControlApi('delta', {} as unknown as DefaultControlApi);
    await replacePanelPromise;
    expect(controlsManager.controlsInOrder$.value.map((element) => element.id)).toEqual([
      'alpha',
      'delta',
      'charlie',
    ]);
  });

  describe('untilInitialized', () => {
    test('should not resolve until all controls are initialized', async () => {
      const controlsManager = initControlsManager(
        {
          alpha: { type: 'testControl', order: 0 },
          bravo: { type: 'testControl', order: 1 },
        },
        DEFAULT_DATA_VIEW_ID
      );
      let isDone = false;
      controlsManager.api.untilInitialized().then(() => {
        isDone = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(isDone).toBe(false);

      controlsManager.setControlApi('alpha', {} as unknown as DefaultControlApi);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(isDone).toBe(false);

      controlsManager.setControlApi('bravo', {} as unknown as DefaultControlApi);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(isDone).toBe(true);
    });

    test('should resolve when all control already initialized ', async () => {
      const controlsManager = initControlsManager(
        {
          alpha: { type: 'testControl', order: 0 },
          bravo: { type: 'testControl', order: 1 },
        },
        DEFAULT_DATA_VIEW_ID
      );
      controlsManager.setControlApi('alpha', {} as unknown as DefaultControlApi);
      controlsManager.setControlApi('bravo', {} as unknown as DefaultControlApi);

      let isDone = false;
      controlsManager.api.untilInitialized().then(() => {
        isDone = true;
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(isDone).toBe(true);
    });
  });
});

describe('snapshotControlsRuntimeState', () => {
  test('should snapshot runtime state for all controls', async () => {
    const controlsManager = initControlsManager(
      {
        alpha: { type: 'testControl', order: 1 },
        bravo: { type: 'testControl', order: 0 },
      },
      DEFAULT_DATA_VIEW_ID
    );
    controlsManager.setControlApi('alpha', {
      snapshotRuntimeState: () => {
        return { key1: 'alpha value' };
      },
    } as unknown as DefaultControlApi);
    controlsManager.setControlApi('bravo', {
      snapshotRuntimeState: () => {
        return { key1: 'bravo value' };
      },
    } as unknown as DefaultControlApi);
    expect(controlsManager.snapshotControlsRuntimeState()).toEqual({
      alpha: {
        key1: 'alpha value',
        order: 1,
        type: 'testControl',
      },
      bravo: {
        key1: 'bravo value',
        order: 0,
        type: 'testControl',
      },
    });
  });
});

describe('getLastUsedDataViewId', () => {
  test('should return last used data view id', () => {
    const dataViewId = getLastUsedDataViewId(
      [
        { id: 'alpha', type: 'testControl' },
        { id: 'bravo', type: 'testControl' },
        { id: 'charlie', type: 'testControl' },
      ],
      {
        alpha: { dataViewId: '1', type: 'testControl', order: 0 },
        bravo: { dataViewId: '2', type: 'testControl', order: 1 },
        charlie: { type: 'testControl', order: 2 },
      }
    );
    expect(dataViewId).toBe('2');
  });

  test('should return undefined when there are no controls', () => {
    const dataViewId = getLastUsedDataViewId([], {});
    expect(dataViewId).toBeUndefined();
  });

  test('should return undefined when there are no controls with data views', () => {
    const dataViewId = getLastUsedDataViewId([{ id: 'alpha', type: 'testControl' }], {
      alpha: { type: 'testControl', order: 0 },
    });
    expect(dataViewId).toBeUndefined();
  });
});

describe('getNewControlState', () => {
  test('should contain defaults when there are no existing controls', () => {
    const controlsManager = initControlsManager({}, DEFAULT_DATA_VIEW_ID);
    expect(controlsManager.getNewControlState()).toEqual({
      grow: true,
      width: 'medium',
      dataViewId: DEFAULT_DATA_VIEW_ID,
    });
  });

  test('should start with defaults if there are existing controls', () => {
    const controlsManager = initControlsManager(
      {
        alpha: {
          type: 'testControl',
          order: 1,
          dataViewId: 'myOtherDataViewId',
          width: 'small',
          grow: false,
        } as ControlPanelState & Pick<DefaultDataControlState, 'dataViewId'>,
      },
      DEFAULT_DATA_VIEW_ID
    );
    expect(controlsManager.getNewControlState()).toEqual({
      grow: true,
      width: 'medium',
      dataViewId: 'myOtherDataViewId',
    });
  });

  test('should contain values of last added control', () => {
    const controlsManager = initControlsManager({}, DEFAULT_DATA_VIEW_ID);
    controlsManager.api.addNewPanel({
      panelType: 'testControl',
      initialState: {
        grow: false,
        width: 'small',
        dataViewId: 'myOtherDataViewId',
      },
    });
    expect(controlsManager.getNewControlState()).toEqual({
      grow: false,
      width: 'small',
      dataViewId: 'myOtherDataViewId',
    });
  });
});
