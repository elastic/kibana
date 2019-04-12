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

jest.mock('ui/metadata', () => ({
  metadata: {
    branch: 'my-metadata-branch',
    version: 'my-metadata-version',
  },
}));

jest.mock(
  'ui/notify',
  () => ({
    toastNotifications: {
      addSuccess: () => {},
    },
  }),
  { virtual: true }
);

jest.mock('ui/capabilities', () => ({
  uiCapabilities: {
    visualize: {
      save: true,
    },
  },
}));

import React from 'react';
import {
  HELLO_WORLD_EMBEDDABLE,
  HelloWorldEmbeddableFactory,
  HelloWorldContainer,
} from '../../../../__test__/index';

import { AddPanelFlyout } from './add_panel_flyout';
import { Container } from 'plugins/embeddable_api/containers';
import { EmbeddableFactoryRegistry } from 'plugins/embeddable_api/embeddables';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { skip } from 'rxjs/operators';

const onClose = jest.fn();
let container: Container;

function createHelloWorldContainer(input = { id: '123', panels: {} }) {
  const embeddableFactories = new EmbeddableFactoryRegistry();
  embeddableFactories.registerFactory(new HelloWorldEmbeddableFactory());
  return new HelloWorldContainer(input, embeddableFactories);
}

beforeEach(() => {
  container = createHelloWorldContainer();
});

test('matches snapshot', async () => {
  const component = shallowWithIntl(<AddPanelFlyout container={container} onClose={onClose} />);

  expect(component).toMatchSnapshot();
});

test('adds a panel to the container', async done => {
  const component = mountWithIntl(<AddPanelFlyout container={container} onClose={onClose} />);

  expect(Object.values(container.getInput().panels).length).toBe(0);

  const subscription = container
    .getInput$()
    .pipe(skip(1))
    .subscribe(input => {
      expect(input.panels).toBeDefined();
      if (input.panels) {
        expect(Object.values(input.panels).length).toBe(1);
        subscription.unsubscribe();
      }
      done();
    });

  findTestSubject(component, 'createNew').simulate('click');
  findTestSubject(component, `createNew-${HELLO_WORLD_EMBEDDABLE}`).simulate('click');
});
