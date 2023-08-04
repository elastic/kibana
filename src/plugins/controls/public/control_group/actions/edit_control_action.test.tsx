/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableFactory, ErrorEmbeddable } from '@kbn/embeddable-plugin/public';

import { ControlOutput } from '../../types';
import { ControlGroupInput } from '../types';
import { pluginServices } from '../../services';
import { EditControlAction } from './edit_control_action';
import { DeleteControlAction } from './delete_control_action';
import { TimeSliderEmbeddableFactory } from '../../time_slider';
import { OptionsListEmbeddableFactory, OptionsListEmbeddableInput } from '../../options_list';
import { ControlGroupContainer } from '../embeddable/control_group_container';
import { OptionsListEmbeddable } from '../../options_list/embeddable/options_list_embeddable';
import { mockedReduxEmbeddablePackage } from '@kbn/presentation-util-plugin/public/mocks';

const controlGroupInput = { chainingSystem: 'NONE', panels: {} } as ControlGroupInput;
const deleteControlAction = new DeleteControlAction();

test('Action is incompatible with Error Embeddables', async () => {
  const editControlAction = new EditControlAction(deleteControlAction);
  const errorEmbeddable = new ErrorEmbeddable('Wow what an awful error', { id: ' 404' });
  expect(await editControlAction.isCompatible({ embeddable: errorEmbeddable as any })).toBe(false);
});

test('Action is incompatible with embeddables that are not editable', async () => {
  const mockEmbeddableFactory = new TimeSliderEmbeddableFactory();
  const mockGetFactory = jest.fn().mockReturnValue(mockEmbeddableFactory);
  pluginServices.getServices().controls.getControlFactory = mockGetFactory;
  pluginServices.getServices().embeddable.getEmbeddableFactory = mockGetFactory;

  const editControlAction = new EditControlAction(deleteControlAction);
  const emptyContainer = new ControlGroupContainer(mockedReduxEmbeddablePackage, controlGroupInput);
  await emptyContainer.untilInitialized();
  await emptyContainer.addTimeSliderControl();

  expect(
    await editControlAction.isCompatible({
      embeddable: emptyContainer.getChild(emptyContainer.getChildIds()[0]) as any,
    })
  ).toBe(false);
});

test('Action is compatible with embeddables that are editable', async () => {
  const mockEmbeddableFactory = new OptionsListEmbeddableFactory();
  (mockEmbeddableFactory as unknown as EmbeddableFactory).create = mockEmbeddableFactory.create;
  const mockGetFactory = jest.fn().mockReturnValue(mockEmbeddableFactory);
  pluginServices.getServices().controls.getControlFactory = mockGetFactory;
  pluginServices.getServices().embeddable.getEmbeddableFactory = mockGetFactory;

  const editControlAction = new EditControlAction(deleteControlAction);
  const emptyContainer = new ControlGroupContainer(mockedReduxEmbeddablePackage, controlGroupInput);
  await emptyContainer.untilInitialized();
  await emptyContainer.addOptionsListControl({
    dataViewId: 'test-data-view',
    title: 'test',
    fieldName: 'test-field',
    width: 'medium',
    grow: false,
  });

  expect(
    await editControlAction.isCompatible({
      embeddable: emptyContainer.getChild(emptyContainer.getChildIds()[0]) as any,
    })
  ).toBe(true);
});

test('Execute throws an error when called with an embeddable not in a parent', async () => {
  const editControlAction = new EditControlAction(deleteControlAction);
  const optionsListEmbeddable = new OptionsListEmbeddable(
    mockedReduxEmbeddablePackage,
    {} as OptionsListEmbeddableInput,
    {} as ControlOutput
  );
  await expect(async () => {
    await editControlAction.execute({ embeddable: optionsListEmbeddable });
  }).rejects.toThrow(Error);
});

test('Execute should open a flyout', async () => {
  const spyOn = jest.fn().mockResolvedValue(undefined);
  pluginServices.getServices().overlays.openFlyout = spyOn;

  const emptyContainer = new ControlGroupContainer(mockedReduxEmbeddablePackage, controlGroupInput);
  await emptyContainer.untilInitialized();
  await emptyContainer.addOptionsListControl({
    dataViewId: 'test-data-view',
    title: 'test',
    fieldName: 'test-field',
    width: 'medium',
    grow: false,
  });
  const embeddable: OptionsListEmbeddable = emptyContainer.getChild(
    emptyContainer.getChildIds()[0]
  );

  const editControlAction = new EditControlAction(deleteControlAction);
  await editControlAction.execute({ embeddable });
  expect(spyOn).toHaveBeenCalled();
});
