/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { waitFor } from '@testing-library/dom';
import { render } from '@testing-library/react';
import {
  HelloWorldEmbeddable,
  HelloWorldEmbeddableFactoryDefinition,
  HELLO_WORLD_EMBEDDABLE,
} from '../../tests/fixtures';
import { EmbeddableRenderer } from './embeddable_renderer';
import { embeddablePluginMock } from '../../mocks';

describe('<EmbeddableRenderer/>', () => {
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
    await waitFor(() => !queryByTestId('embedSpinner')); // wait until spinner disappears
    expect(getByTestId('helloWorldEmbeddable')).toBeInTheDocument();
  });
});
