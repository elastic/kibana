/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// @ts-ignore
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
// eslint-disable-next-line
import { coreMock } from '../../../../core/public/mocks';
import { testPlugin } from './test_plugin';
import { CustomizePanelModal } from '../lib/panel/panel_header/panel_actions/customize_title/customize_panel_modal';
import { mount } from 'enzyme';
import { EmbeddableStart } from '../plugin';
import { createEmbeddablePanelMock } from '../mocks';

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
    {} as any
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

test('Is initialized with the embeddables title', async () => {
  const component = mount(<CustomizePanelModal embeddable={embeddable} updateTitle={() => {}} />);

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  expect(inputField.props().placeholder).toBe(embeddable.getOutput().title);
  expect(inputField.props().placeholder).toBe(embeddable.getOutput().defaultTitle);
  expect(inputField.props().value).toBe('');
});

test('Calls updateTitle with a new title', async () => {
  const updateTitle = jest.fn();
  const component = mount(
    <CustomizePanelModal embeddable={embeddable} updateTitle={updateTitle} />
  );

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  const event = { target: { value: 'new title' } };
  inputField.simulate('change', event);

  findTestSubject(component, 'saveNewTitleButton').simulate('click');

  expect(updateTitle).toBeCalledWith('new title');
});

test('Input value shows custom title if one given', async () => {
  embeddable.updateInput({ title: 'new title' });

  const updateTitle = jest.fn();
  const component = mount(
    <CustomizePanelModal embeddable={embeddable} updateTitle={updateTitle} />
  );

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  expect(inputField.props().value).toBe('new title');
  findTestSubject(component, 'saveNewTitleButton').simulate('click');
  expect(inputField.props().value).toBe('new title');
});

test('Reset updates the input with the default title when the embeddable has no title override', async () => {
  const updateTitle = jest.fn();

  embeddable.updateInput({ title: 'my custom title' });
  const component = mount(
    <CustomizePanelModal embeddable={embeddable} updateTitle={updateTitle} />
  );

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  const event = { target: { value: 'another custom title' } };
  inputField.simulate('change', event);

  findTestSubject(component, 'resetCustomEmbeddablePanelTitle').simulate('click');
  expect(inputField.props().placeholder).toBe(embeddable.getOutput().defaultTitle);
});

test('Reset updates the input with the default title when the embeddable has a title override', async () => {
  const updateTitle = jest.fn();
  const component = mount(
    <CustomizePanelModal embeddable={embeddable} updateTitle={updateTitle} />
  );

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  const event = { target: { value: 'new title' } };
  inputField.simulate('change', event);

  findTestSubject(component, 'resetCustomEmbeddablePanelTitle').simulate('click');
  expect(inputField.props().placeholder).toBe(embeddable.getOutput().defaultTitle);
});

test('Reset calls updateTitle with undefined', async () => {
  const updateTitle = jest.fn();
  const component = mount(
    <CustomizePanelModal embeddable={embeddable} updateTitle={updateTitle} />
  );

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  const event = { target: { value: 'new title' } };
  inputField.simulate('change', event);

  findTestSubject(component, 'resetCustomEmbeddablePanelTitle').simulate('click');
  findTestSubject(component, 'saveNewTitleButton').simulate('click');

  expect(updateTitle).toBeCalledWith(undefined);
});

test('Can set title to an empty string', async () => {
  const updateTitle = jest.fn();
  const component = mount(
    <CustomizePanelModal embeddable={embeddable} updateTitle={updateTitle} />
  );

  const inputField = findTestSubject(component, 'customizePanelHideTitle');
  inputField.simulate('click');

  findTestSubject(component, 'saveNewTitleButton').simulate('click');
  expect(inputField.props().value).toBeUndefined();
  expect(updateTitle).toBeCalledWith('');
});
