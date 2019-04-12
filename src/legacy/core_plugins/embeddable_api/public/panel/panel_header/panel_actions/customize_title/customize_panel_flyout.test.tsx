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

import React from 'react';
import {
  HELLO_WORLD_EMBEDDABLE,
  HelloWorldEmbeddableFactory,
  HelloWorldContainer,
  HelloWorldEmbeddable,
  HelloWorldInput,
} from '../../../../__test__/index';

import { CustomizePanelFlyout } from './customize_panel_flyout';
import { Container } from 'plugins/embeddable_api/containers';
import { EmbeddableFactoryRegistry, isErrorEmbeddable } from 'plugins/embeddable_api/embeddables';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

let container: Container;
let embeddable: HelloWorldEmbeddable;

beforeEach(async () => {
  const embeddableFactories = new EmbeddableFactoryRegistry();
  embeddableFactories.registerFactory(new HelloWorldEmbeddableFactory());
  container = new HelloWorldContainer({ id: '123', panels: {} }, embeddableFactories);
  const helloEmbeddable = await container.addNewEmbeddable<HelloWorldInput, HelloWorldEmbeddable>(
    HELLO_WORLD_EMBEDDABLE,
    {
      firstName: 'Joe',
    }
  );
  if (isErrorEmbeddable(helloEmbeddable)) {
    throw new Error('Error creating new hello world embeddable');
  } else {
    embeddable = helloEmbeddable;
  }
});

test('matches snapshot', async () => {
  const component = shallowWithIntl(
    <CustomizePanelFlyout embeddable={embeddable} updateTitle={() => {}} />
  );

  expect(component).toMatchSnapshot();
});
