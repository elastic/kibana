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

import { getModalContents } from '../../../../np_core.test.mocks';

import React from 'react';
import {
  CONTACT_CARD_EMBEDDABLE,
  ContactCardEmbeddableFactory,
  HelloWorldContainer,
  ContactCardEmbeddable,
  ContactCardInitializerProps,
} from '../../../../test_samples/index';

import { AddPanelFlyout } from './add_panel_flyout';
import { Container } from '../../../..';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { skip } from 'rxjs/operators';
import * as Rx from 'rxjs';
import { createRegistry } from '../../../../create_registry';
import { EmbeddableFactory } from '../../../../embeddables';

const onClose = jest.fn();
let container: Container;

function createHelloWorldContainer(input = { id: '123', panels: {} }) {
  const embeddableFactories = createRegistry<EmbeddableFactory>();
  embeddableFactories.set(CONTACT_CARD_EMBEDDABLE, new ContactCardEmbeddableFactory());
  return new HelloWorldContainer(input, embeddableFactories);
}

beforeEach(() => {
  container = createHelloWorldContainer();
});

test('create new calls factory.adds a panel to the container', async done => {
  const component = mountWithIntl(<AddPanelFlyout container={container} onClose={onClose} />);

  expect(Object.values(container.getInput().panels).length).toBe(0);

  const subscription = Rx.merge(container.getOutput$(), container.getInput$())
    .pipe(skip(2))
    .subscribe(() => {
      if (container.getInput().panels) {
        const ids = Object.keys(container.getInput().panels);
        expect(ids.length).toBe(1);
        const embeddableId = ids[0];

        if (container.getOutput().embeddableLoaded[embeddableId]) {
          const child = container.getChild<ContactCardEmbeddable>(embeddableId);
          expect(child).toBeDefined();
          expect(child.getInput().firstName).toBe('Dany');
          expect(child.getInput().lastName).toBe('Targaryan');
          subscription.unsubscribe();
          done();
        }
      }
    });

  findTestSubject(component, 'createNew').simulate('click');
  findTestSubject(component, `createNew-${CONTACT_CARD_EMBEDDABLE}`).simulate('click');

  await nextTick();

  (getModalContents().props as ContactCardInitializerProps).onCreate({
    firstName: 'Dany',
    lastName: 'Targaryan',
  });
});
