/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { render } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import {
  HelloWorldEmbeddable,
  HelloWorldEmbeddableFactoryDefinition,
  HELLO_WORLD_EMBEDDABLE,
} from '../../tests/fixtures';
import { EmbeddableRenderer, useEmbeddableFactory } from './embeddable_renderer';
import { embeddablePluginMock } from '../../mocks';

describe('useEmbeddableFactory', () => {
  it('should update upstream value changes', async () => {
    const { setup, doStart } = embeddablePluginMock.createInstance();
    const getFactory = setup.registerEmbeddableFactory(
      HELLO_WORLD_EMBEDDABLE,
      new HelloWorldEmbeddableFactoryDefinition()
    );
    doStart();

    const { result, waitForNextUpdate } = renderHook(() =>
      useEmbeddableFactory({ factory: getFactory(), input: { id: 'hello' } })
    );

    const [, loading] = result.current;

    expect(loading).toBe(true);

    await waitForNextUpdate();

    const [embeddable] = result.current;
    expect(embeddable).toBeDefined();
  });
});

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
