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

import React from 'react';
import { wait } from '@testing-library/dom';
import { cleanup, render } from '@testing-library/react/pure';
import {
  HelloWorldEmbeddable,
  HelloWorldEmbeddableFactoryDefinition,
  HELLO_WORLD_EMBEDDABLE,
} from '../../../../../../examples/embeddable_examples/public/hello_world';
import { EmbeddableRenderer } from './embeddable_renderer';
import { embeddablePluginMock } from '../../mocks';

describe('<EmbeddableRenderer/>', () => {
  afterEach(cleanup);

  test('Render embeddable', () => {
    const embeddable = new HelloWorldEmbeddable({ id: 'hello' });
    const { getByTestId } = render(<EmbeddableRenderer embeddable={embeddable} />);
    expect(getByTestId('helloWorldEmbeddable')).toBeInTheDocument();
  });

  test('Render factory', async () => {
    const { setup, doStart } = embeddablePluginMock.createInstance();
    const getFactory = setup.registerEmbeddableFactory(
      HELLO_WORLD_EMBEDDABLE,
      new HelloWorldEmbeddableFactoryDefinition()
    );
    doStart();

    const { getByTestId, queryByTestId } = render(
      <EmbeddableRenderer factory={getFactory()} input={{ id: 'hello' }} />
    );
    expect(getByTestId('embedSpinner')).toBeInTheDocument();
    await wait(() => !queryByTestId('embedSpinner')); // wait until spinner disappears
    expect(getByTestId('helloWorldEmbeddable')).toBeInTheDocument();
  });
});
