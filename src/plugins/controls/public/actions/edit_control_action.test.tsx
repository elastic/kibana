/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import dateMath from '@kbn/datemath';
import { ErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { ViewMode } from '@kbn/presentation-publishing';

import { getOptionsListControlFactory } from '../react_controls/controls/data_controls/options_list_control/get_options_list_control_factory';
import type { OptionsListControlApi } from '../react_controls/controls/data_controls/options_list_control/types';
import {
  getMockedBuildApi,
  getMockedControlGroupApi,
} from '../react_controls/controls/mocks/control_mocks';
import { getTimesliderControlFactory } from '../react_controls/controls/timeslider_control/get_timeslider_control_factory';
import { EditControlAction } from './edit_control_action';

const mockDataViews = dataViewPluginMocks.createStartContract();
const mockCore = coreMock.createStart();
const dataStartServiceMock = dataPluginMock.createStartContract();
dataStartServiceMock.query.timefilter.timefilter.calculateBounds = (timeRange: TimeRange) => {
  const now = new Date();
  return {
    min: dateMath.parse(timeRange.from, { forceNow: now }),
    max: dateMath.parse(timeRange.to, { roundUp: true, forceNow: now }),
  };
};

const dashboardApi = {
  viewMode: new BehaviorSubject<ViewMode>('view'),
};
const controlGroupApi = getMockedControlGroupApi(dashboardApi, {
  removePanel: jest.fn(),
  replacePanel: jest.fn(),
  addNewPanel: jest.fn(),
  children$: new BehaviorSubject({}),
});

let optionsListApi: OptionsListControlApi;
beforeAll(async () => {
  const controlFactory = getOptionsListControlFactory({
    core: mockCore,
    data: dataStartServiceMock,
    dataViews: mockDataViews,
  });

  const optionsListUuid = 'optionsListControl';
  const optionsListControl = await controlFactory.buildControl(
    {
      dataViewId: 'test-data-view',
      title: 'test',
      fieldName: 'test-field',
      width: 'medium',
      grow: false,
    },
    getMockedBuildApi(optionsListUuid, controlFactory, controlGroupApi),
    optionsListUuid,
    controlGroupApi
  );

  optionsListApi = optionsListControl.api;
});

describe('Incompatible embeddables', () => {
  test('Action is incompatible with Error Embeddables', async () => {
    const editControlAction = new EditControlAction();
    const errorEmbeddable = new ErrorEmbeddable('Wow what an awful error', { id: ' 404' });
    expect(await editControlAction.isCompatible({ embeddable: errorEmbeddable as any })).toBe(
      false
    );
  });

  test('Action is incompatible with embeddables that are not editable', async () => {
    const timeSliderFactory = getTimesliderControlFactory({
      core: mockCore,
      data: dataStartServiceMock,
    });
    const timeSliderUuid = 'timeSliderControl';
    const timeSliderControl = await timeSliderFactory.buildControl(
      {},
      getMockedBuildApi(timeSliderUuid, timeSliderFactory, controlGroupApi),
      timeSliderUuid,
      controlGroupApi
    );
    const editControlAction = new EditControlAction();
    expect(
      await editControlAction.isCompatible({
        embeddable: timeSliderControl,
      })
    ).toBe(false);
  });

  test('Execute throws an error when called with an embeddable not in a parent', async () => {
    const editControlAction = new EditControlAction();
    const noParentApi = { ...optionsListApi, parentApi: undefined };
    await expect(async () => {
      await editControlAction.execute({ embeddable: noParentApi });
    }).rejects.toThrow(Error);
  });
});

describe('Compatible embeddables', () => {
  beforeAll(() => {
    dashboardApi.viewMode.next('edit');
  });

  test('Action is compatible with embeddables that are editable', async () => {
    const editControlAction = new EditControlAction();
    expect(
      await editControlAction.isCompatible({
        embeddable: optionsListApi,
      })
    ).toBe(true);
  });

  test('Execute should call `onEdit` provided by embeddable', async () => {
    const onEditSpy = jest.fn();
    optionsListApi.onEdit = onEditSpy;

    const editControlAction = new EditControlAction();
    expect(onEditSpy).not.toHaveBeenCalled();
    await editControlAction.execute({ embeddable: optionsListApi });
    expect(onEditSpy).toHaveBeenCalledTimes(1);
  });
});
