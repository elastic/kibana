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

import '../../../../np_core.test.mocks';

import React from 'react';
import {
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableFactory,
  HelloWorldContainer,
  ContactCardEmbeddableOutput,
  ContactCardEmbeddable,
  ContactCardEmbeddableInput,
} from '../../../../test_samples/index';

// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';
import { CustomizePanelModal } from './customize_panel_modal';
import { Container, isErrorEmbeddable } from '../../../..';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { createRegistry } from '../../../../create_registry';
import { EmbeddableFactory } from '../../../../embeddables';

let container: Container;
let embeddable: ContactCardEmbeddable;

beforeEach(async () => {
  const embeddableFactories = createRegistry<EmbeddableFactory>();
  embeddableFactories.set(CONTACT_CARD_EMBEDDABLE, new ContactCardEmbeddableFactory());
  container = new HelloWorldContainer({ id: '123', panels: {} }, embeddableFactories);
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
  const component = mountWithIntl(
    <CustomizePanelModal.WrappedComponent
      intl={null as any}
      embeddable={embeddable}
      updateTitle={() => {}}
    />
  );

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  expect(inputField.props().placeholder).toBe(embeddable.getOutput().title);
  expect(inputField.props().placeholder).toBe(embeddable.getOutput().defaultTitle);
  expect(inputField.props().value).toBe('');
});

test('Calls updateTitle with a new title', async () => {
  const updateTitle = jest.fn();
  const component = mountWithIntl(
    <CustomizePanelModal.WrappedComponent
      intl={null as any}
      embeddable={embeddable}
      updateTitle={updateTitle}
    />
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
  const component = mountWithIntl(
    <CustomizePanelModal.WrappedComponent
      intl={null as any}
      embeddable={embeddable}
      updateTitle={updateTitle}
    />
  );

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  expect(inputField.props().value).toBe('new title');
  findTestSubject(component, 'saveNewTitleButton').simulate('click');
  expect(inputField.props().value).toBe('new title');
});

test('Reset updates the input with the default title when the embeddable has no title override', async () => {
  const updateTitle = jest.fn();

  embeddable.updateInput({ title: 'my custom title' });
  const component = mountWithIntl(
    <CustomizePanelModal.WrappedComponent
      intl={null as any}
      embeddable={embeddable}
      updateTitle={updateTitle}
    />
  );

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  const event = { target: { value: 'another custom title' } };
  inputField.simulate('change', event);

  findTestSubject(component, 'resetCustomEmbeddablePanelTitle').simulate('click');
  expect(inputField.props().placeholder).toBe(embeddable.getOutput().defaultTitle);
});

test('Reset updates the input with the default title when the embeddable has a title override', async () => {
  const updateTitle = jest.fn();
  const component = mountWithIntl(
    <CustomizePanelModal.WrappedComponent
      intl={null as any}
      embeddable={embeddable}
      updateTitle={updateTitle}
    />
  );

  const inputField = findTestSubject(component, 'customEmbeddablePanelTitleInput').find('input');
  const event = { target: { value: 'new title' } };
  inputField.simulate('change', event);

  findTestSubject(component, 'resetCustomEmbeddablePanelTitle').simulate('click');
  expect(inputField.props().placeholder).toBe(embeddable.getOutput().defaultTitle);
});

test('Reset calls updateTitle with undefined', async () => {
  const updateTitle = jest.fn();
  const component = mountWithIntl(
    <CustomizePanelModal.WrappedComponent
      intl={null as any}
      embeddable={embeddable}
      updateTitle={updateTitle}
    />
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
  const component = mountWithIntl(
    <CustomizePanelModal.WrappedComponent
      intl={null as any}
      embeddable={embeddable}
      updateTitle={updateTitle}
    />
  );

  const inputField = findTestSubject(component, 'customizePanelHideTitle');
  inputField.simulate('change');

  findTestSubject(component, 'saveNewTitleButton').simulate('click');
  expect(inputField.props().value).toBeUndefined();
  expect(updateTitle).toBeCalledWith('');
});
