/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { findTestSubject } from '@elastic/eui/lib/test';
import * as React from 'react';
import { Container, isErrorEmbeddable } from '../lib';
import {
  ContactCardEmbeddable,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
} from '../lib/test_samples/embeddables/contact_card/contact_card_embeddable';
import {
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableFactory,
} from '../lib/test_samples/embeddables/contact_card/contact_card_embeddable_factory';
import { HelloWorldContainer } from '../lib/test_samples/embeddables/hello_world_container';
import { coreMock } from '@kbn/core/public/mocks';
import { testPlugin } from './test_plugin';
import { CustomizePanelEditor } from '../lib/panel/panel_header/panel_actions/customize_panel/customize_panel_editor';
import { EmbeddableStart } from '../plugin';
import { createEmbeddablePanelMock } from '../mocks';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { OverlayStart } from '@kbn/core/public';

let api: EmbeddableStart;
let container: Container;
let embeddable: ContactCardEmbeddable;

beforeEach(async () => {
  const { doStart, coreStart, uiActions, setup } = testPlugin(
    coreMock.createSetup(),
    coreMock.createStart()
  );

  const contactCardFactory = new ContactCardEmbeddableFactory(
    uiActions.executeTriggerActions,
    {} as unknown as OverlayStart
  );
  setup.registerEmbeddableFactory(contactCardFactory.type, contactCardFactory);

  api = doStart();

  const testPanel = createEmbeddablePanelMock({
    getActions: uiActions.getTriggerCompatibleActions,
    getEmbeddableFactory: api.getEmbeddableFactory,
    getAllEmbeddableFactories: api.getEmbeddableFactories,
    overlays: coreStart.overlays,
    notifications: coreStart.notifications,
    application: coreStart.application,
  });
  container = new HelloWorldContainer(
    { id: '123', panels: {} },
    {
      getEmbeddableFactory: api.getEmbeddableFactory,
      panelComponent: testPanel,
    }
  );
  const contactCardEmbeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Joe',
  });
  if (isErrorEmbeddable(contactCardEmbeddable)) {
    throw new Error('Error creating new hello world embeddable');
  } else {
    embeddable = contactCardEmbeddable;
  }
});

test('Value is initialized with the embeddables title', async () => {
  const component = mountWithIntl(
    <CustomizePanelEditor embeddable={embeddable} onClose={() => {}} />
  );

  const titleField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  const descriptionField = findTestSubject(component, 'customEmbeddablePanelDescriptionInput').find(
    'textarea'
  );
  expect(titleField.props().value).toBe(embeddable.getOutput().title);
  expect(titleField.props().value).toBe(embeddable.getOutput().defaultTitle);
  expect(descriptionField.props().value).toBe(embeddable.getOutput().description);
  expect(descriptionField.props().value).toBe(embeddable.getOutput().defaultDescription);
});

test('Calls updateInput with a new title', async () => {
  const updateInput = jest.spyOn(embeddable, 'updateInput');
  const component = mountWithIntl(
    <CustomizePanelEditor embeddable={embeddable} onClose={() => {}} />
  );

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  const event = { target: { value: 'new title' } };
  inputField.simulate('change', event);

  findTestSubject(component, 'saveCustomizePanelButton').simulate('click');

  expect(updateInput).toBeCalledWith({
    description: undefined,
    hidePanelTitles: undefined,
    title: 'new title',
  });
});

test('Input value shows custom title if one given', async () => {
  embeddable.updateInput({ title: 'new title' });
  const component = mountWithIntl(
    <CustomizePanelEditor embeddable={embeddable} onClose={() => {}} />
  );

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  expect(inputField.props().value).toBe('new title');
  findTestSubject(component, 'saveCustomizePanelButton').simulate('click');
  expect(inputField.props().value).toBe('new title');
});

test('Reset updates the input values with the default properties when the embeddable has overridden the properties', async () => {
  embeddable.updateInput({ title: 'my custom title', description: 'my custom description' });
  const component = mountWithIntl(
    <CustomizePanelEditor embeddable={embeddable} onClose={() => {}} />
  );

  const titleField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  const event = { target: { value: 'another custom title' } };
  titleField.simulate('change', event);

  findTestSubject(component, 'resetCustomEmbeddablePanelTitleButton').simulate('click');
  const titleAfter = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  expect(titleAfter.props().value).toBe(embeddable.getOutput().defaultTitle);

  findTestSubject(component, 'resetCustomEmbeddablePanelDescriptionButton').simulate('click');
  const descriptionAfter = findTestSubject(component, 'customEmbeddablePanelDescriptionInput').find(
    'textarea'
  );
  expect(descriptionAfter.props().value).toBe(embeddable.getOutput().defaultDescription);
});

test('Reset updates the input with the default properties when the embeddable has no property overrides', async () => {
  const component = mountWithIntl(
    <CustomizePanelEditor embeddable={embeddable} onClose={() => {}} />
  );

  const titleField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  const titleEvent = { target: { value: 'new title' } };
  titleField.simulate('change', titleEvent);

  const descriptionField = findTestSubject(component, 'customEmbeddablePanelDescriptionInput').find(
    'textarea'
  );
  const descriptionEvent = { target: { value: 'new description' } };
  titleField.simulate('change', descriptionEvent);

  findTestSubject(component, 'resetCustomEmbeddablePanelTitleButton').simulate('click');
  findTestSubject(component, 'resetCustomEmbeddablePanelDescriptionButton').simulate('click');

  await component.update();
  expect(titleField.props().value).toBe(embeddable.getOutput().defaultTitle);
  expect(descriptionField.props().value).toBe(embeddable.getOutput().defaultDescription);
});

test('Reset title calls updateInput with undefined', async () => {
  const updateInput = jest.spyOn(embeddable, 'updateInput');
  const component = mountWithIntl(
    <CustomizePanelEditor embeddable={embeddable} onClose={() => {}} />
  );

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  const event = { target: { value: 'new title' } };
  inputField.simulate('change', event);

  findTestSubject(component, 'resetCustomEmbeddablePanelTitleButton').simulate('click');
  findTestSubject(component, 'saveCustomizePanelButton').simulate('click');

  expect(updateInput).toBeCalledWith({
    description: undefined,
    hidePanelTitles: undefined,
    title: undefined,
  });
});

test('Can set title and description to an empty string', async () => {
  const updateInput = jest.spyOn(embeddable, 'updateInput');
  const component = mountWithIntl(
    <CustomizePanelEditor embeddable={embeddable} onClose={() => {}} />
  );

  for (const subject of [
    'customEmbeddablePanelTitleInput',
    'customEmbeddablePanelDescriptionInput',
  ]) {
    const inputField = findTestSubject(component, subject);
    const event = { target: { value: '' } };
    inputField.simulate('change', event);
  }

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput');
  const event = { target: { value: '' } };
  inputField.simulate('change', event);

  findTestSubject(component, 'saveCustomizePanelButton').simulate('click');
  const inputFieldAfter = findTestSubject(component, 'customEmbeddablePanelTitleInput');
  expect(inputFieldAfter.props().value).toBe('');
  expect(updateInput).toBeCalledWith({ description: '', hidePanelTitles: undefined, title: '' });
});
