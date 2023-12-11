/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ErrorEmbeddable } from '@kbn/embeddable-plugin/public';

import { OPTIONS_LIST_CONTROL } from '../../../common';
import { ControlOutput } from '../../types';
import { ControlGroupInput } from '../types';
import { pluginServices } from '../../services';
import { DeleteControlAction } from './delete_control_action';
import { OptionsListEmbeddableInput } from '../../options_list';
import { controlGroupInputBuilder } from '../external_api/control_group_input_builder';
import { ControlGroupContainer } from '../embeddable/control_group_container';
import { OptionsListEmbeddableFactory } from '../../options_list/embeddable/options_list_embeddable_factory';
import { OptionsListEmbeddable } from '../../options_list/embeddable/options_list_embeddable';
import { mockedReduxEmbeddablePackage } from '@kbn/presentation-util-plugin/public/mocks';

let container: ControlGroupContainer;
let embeddable: OptionsListEmbeddable;

beforeAll(async () => {
  pluginServices.getServices().controls.getControlFactory = jest
    .fn()
    .mockImplementation((type: string) => {
      if (type === OPTIONS_LIST_CONTROL) return new OptionsListEmbeddableFactory();
    });

  const controlGroupInput = { chainingSystem: 'NONE', panels: {} } as ControlGroupInput;
  controlGroupInputBuilder.addOptionsListControl(controlGroupInput, {
    dataViewId: 'test-data-view',
    title: 'test',
    fieldName: 'test-field',
    width: 'medium',
    grow: false,
  });
  container = new ControlGroupContainer(mockedReduxEmbeddablePackage, controlGroupInput);
  await container.untilInitialized();

  embeddable = container.getChild(container.getChildIds()[0]);
  expect(embeddable.type).toBe(OPTIONS_LIST_CONTROL);
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
  const optionsListEmbeddable = new OptionsListEmbeddable(
    mockedReduxEmbeddablePackage,
    {} as OptionsListEmbeddableInput,
    {} as ControlOutput
  );
  await expect(async () => {
    await deleteControlAction.execute({ embeddable: optionsListEmbeddable });
  }).rejects.toThrow(Error);
});

describe('Execute should open a confirm modal', () => {
  test('Canceling modal will keep control', async () => {
    const spyOn = jest.fn().mockResolvedValue(false);
    pluginServices.getServices().overlays.openConfirm = spyOn;

    const deleteControlAction = new DeleteControlAction();
    await deleteControlAction.execute({ embeddable });
    expect(spyOn).toHaveBeenCalled();

    expect(container.getPanelCount()).toBe(1);
  });

  test('Confirming modal will delete control', async () => {
    const spyOn = jest.fn().mockResolvedValue(true);
    pluginServices.getServices().overlays.openConfirm = spyOn;

    const deleteControlAction = new DeleteControlAction();
    await deleteControlAction.execute({ embeddable });
    expect(spyOn).toHaveBeenCalled();

    expect(container.getPanelCount()).toBe(0);
  });
});
