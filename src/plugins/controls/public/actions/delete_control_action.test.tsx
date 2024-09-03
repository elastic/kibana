/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';

import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { ErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import { ViewMode } from '@kbn/presentation-publishing';

import { getOptionsListControlFactory } from '../react_controls/controls/data_controls/options_list_control/get_options_list_control_factory';
import { OptionsListControlApi } from '../react_controls/controls/data_controls/options_list_control/types';
import {
  getMockedBuildApi,
  getMockedControlGroupApi,
} from '../react_controls/controls/mocks/control_mocks';
import { pluginServices } from '../services';
import { DeleteControlAction } from './delete_control_action';

const mockDataViews = dataViewPluginMocks.createStartContract();
const mockCore = coreMock.createStart();

const dashboardApi = {
  viewMode: new BehaviorSubject<ViewMode>('view'),
};
const controlGroupApi = getMockedControlGroupApi(dashboardApi, {
  removePanel: jest.fn(),
  replacePanel: jest.fn(),
  addNewPanel: jest.fn(),
  children$: new BehaviorSubject({}),
});

let controlApi: OptionsListControlApi;
beforeAll(async () => {
  const controlFactory = getOptionsListControlFactory({
    core: mockCore,
    data: dataPluginMock.createStartContract(),
    dataViews: mockDataViews,
  });

  const uuid = 'testControl';
  const control = await controlFactory.buildControl(
    {
      dataViewId: 'test-data-view',
      title: 'test',
      fieldName: 'test-field',
      width: 'medium',
      grow: false,
    },
    getMockedBuildApi(uuid, controlFactory, controlGroupApi),
    uuid,
    controlGroupApi
  );

  controlApi = control.api;
});

test('Action is incompatible with Error Embeddables', async () => {
  const deleteControlAction = new DeleteControlAction();
  const errorEmbeddable = new ErrorEmbeddable('Wow what an awful error', { id: ' 404' });
  expect(await deleteControlAction.isCompatible({ embeddable: errorEmbeddable as any })).toBe(
    false
  );
});

test('Execute throws an error when called with an embeddable not in a parent', async () => {
  const deleteControlAction = new DeleteControlAction();
  const { parentApi, ...rest } = controlApi;
  await expect(async () => {
    await deleteControlAction.execute({ embeddable: rest });
  }).rejects.toThrow(Error);
});

describe('Execute should open a confirm modal', () => {
  test('Canceling modal will keep control', async () => {
    const spyOn = jest.fn().mockResolvedValue(false);
    pluginServices.getServices().overlays.openConfirm = spyOn;

    const deleteControlAction = new DeleteControlAction();
    await deleteControlAction.execute({ embeddable: controlApi });
    expect(spyOn).toHaveBeenCalled();

    expect(controlGroupApi.removePanel).not.toHaveBeenCalled();
  });

  test('Confirming modal will delete control', async () => {
    const spyOn = jest.fn().mockResolvedValue(true);
    pluginServices.getServices().overlays.openConfirm = spyOn;

    const deleteControlAction = new DeleteControlAction();
    await deleteControlAction.execute({ embeddable: controlApi });
    expect(spyOn).toHaveBeenCalled();

    expect(controlGroupApi.removePanel).toHaveBeenCalledTimes(1);
  });
});
