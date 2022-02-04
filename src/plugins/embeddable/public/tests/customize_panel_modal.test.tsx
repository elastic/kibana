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
import { coreMock } from '../../../../core/public/mocks';
import { testPlugin } from './test_plugin';
import { CustomizePanelModal } from '../lib/panel/panel_header/panel_actions/customize_title/customize_panel_modal';
import { EmbeddableStart } from '../plugin';
import { createEmbeddablePanelMock } from '../mocks';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { OverlayStart } from 'kibana/public';

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
    <CustomizePanelModal embeddable={embeddable} updateTitle={() => {}} cancel={() => {}} />
  );

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  expect(inputField.props().value).toBe(embeddable.getOutput().title);
  expect(inputField.props().value).toBe(embeddable.getOutput().defaultTitle);
});

test('Calls updateTitle with a new title', async () => {
  const updateTitle = jest.fn();
  const component = mountWithIntl(
    <CustomizePanelModal embeddable={embeddable} updateTitle={updateTitle} cancel={() => {}} />
  );

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  const event = { target: { value: 'new title' } };
  inputField.simulate('change', event);

  findTestSubject(component, 'saveNewTitleButton').simulate('click');

  expect(updateTitle).toBeCalledWith('new title', undefined);
});

test('Input value shows custom title if one given', async () => {
  embeddable.updateInput({ title: 'new title' });

  const updateTitle = jest.fn();
  const component = mountWithIntl(
    <CustomizePanelModal embeddable={embeddable} updateTitle={updateTitle} cancel={() => {}} />
  );

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  expect(inputField.props().value).toBe('new title');
  findTestSubject(component, 'saveNewTitleButton').simulate('click');
  expect(inputField.props().value).toBe('new title');
});

test('Reset updates the input value with the default title when the embeddable has a title override', async () => {
  const updateTitle = jest.fn();

  embeddable.updateInput({ title: 'my custom title' });
  const component = mountWithIntl(
    <CustomizePanelModal embeddable={embeddable} updateTitle={updateTitle} cancel={() => {}} />
  );

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  const event = { target: { value: 'another custom title' } };
  inputField.simulate('change', event);

  findTestSubject(component, 'resetCustomEmbeddablePanelTitle').simulate('click');
  const inputAfter = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  expect(inputAfter.props().value).toBe(embeddable.getOutput().defaultTitle);
});

test('Reset updates the input with the default title when the embeddable has no title override', async () => {
  const updateTitle = jest.fn();
  const component = mountWithIntl(
    <CustomizePanelModal embeddable={embeddable} updateTitle={updateTitle} cancel={() => {}} />
  );

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  const event = { target: { value: 'new title' } };
  inputField.simulate('change', event);

  findTestSubject(component, 'resetCustomEmbeddablePanelTitle').simulate('click');
  await component.update();
  expect(inputField.props().value).toBe(embeddable.getOutput().defaultTitle);
});

test('Reset calls updateTitle with undefined', async () => {
  const updateTitle = jest.fn();
  const component = mountWithIntl(
    <CustomizePanelModal embeddable={embeddable} updateTitle={updateTitle} cancel={() => {}} />
  );

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  const event = { target: { value: 'new title' } };
  inputField.simulate('change', event);

  findTestSubject(component, 'resetCustomEmbeddablePanelTitle').simulate('click');
  findTestSubject(component, 'saveNewTitleButton').simulate('click');

  expect(updateTitle).toBeCalledWith(undefined, undefined);
});

test('Can set title to an empty string', async () => {
  const updateTitle = jest.fn();
  const component = mountWithIntl(
    <CustomizePanelModal embeddable={embeddable} updateTitle={updateTitle} cancel={() => {}} />
  );

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput');
  const event = { target: { value: '' } };
  inputField.simulate('change', event);

  findTestSubject(component, 'saveNewTitleButton').simulate('click');
  const inputFieldAfter = findTestSubject(component, 'customEmbeddablePanelTitleInput');
  expect(inputFieldAfter.props().value).toBe('');
  expect(updateTitle).toBeCalledWith('', undefined);
});
