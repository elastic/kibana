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

jest.mock('ui/capabilities', () => ({
  uiCapabilities: {
    visualize: {
      save: true,
    },
  },
}));

import {
  HELLO_WORLD_EMBEDDABLE,
  HelloWorldEmbeddableFactory,
  HelloWorldContainer,
  HelloWorldEmbeddable,
  HelloWorldInput,
} from '../../../../__test__/index';

import { Container } from 'plugins/embeddable_api/containers';
import { EmbeddableFactoryRegistry, isErrorEmbeddable } from 'plugins/embeddable_api/embeddables';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';
import { nextTick } from 'test_utils/enzyme_helpers';
import { CustomizePanelTitleAction } from './customize_panel_action';

let container: Container;
let embeddable: HelloWorldEmbeddable;

function createHelloWorldContainer(input = { id: '123', panels: {} }) {
  const embeddableFactories = new EmbeddableFactoryRegistry();
  embeddableFactories.registerFactory(new HelloWorldEmbeddableFactory());
  return new HelloWorldContainer(input, embeddableFactories);
}

beforeEach(async () => {
  container = createHelloWorldContainer();
  const helloEmbeddable = await container.addNewEmbeddable<HelloWorldInput, HelloWorldEmbeddable>(
    HELLO_WORLD_EMBEDDABLE,
    {
      id: 'joe',
      firstName: 'Joe',
    }
  );
  if (isErrorEmbeddable(helloEmbeddable)) {
    throw new Error('Error creating new hello world embeddable');
  } else {
    embeddable = helloEmbeddable;
  }
});

test('Updates the embeddable title when given', async done => {
  const getUserData = () => Promise.resolve({ title: 'What is up?' });
  const customizePanelAction = new CustomizePanelTitleAction(getUserData);
  expect(embeddable.getInput().title).toBeUndefined();
  await customizePanelAction.execute({ embeddable, container });
  await nextTick();
  expect(embeddable.getInput().title).toBe('What is up?');

  // Recreating the container should preserve the custom title.
  const containerClone = createHelloWorldContainer(container.getInput());
  // Need to wait for the container to tell us the embeddable has been loaded.
  const subscription = containerClone.getOutput$().subscribe(() => {
    if (containerClone.getOutput().embeddableLoaded[embeddable.id]) {
      expect(embeddable.getInput().title).toBe('What is up?');
      subscription.unsubscribe();
      done();
    }
  });
});
