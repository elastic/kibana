/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { getMockPresentationContainer } from '@kbn/presentation-containers/mocks';
import { render, waitFor, screen } from '@testing-library/react';

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { registerReactEmbeddableFactory } from './react_embeddable_registry';
import { ReactEmbeddableRenderer } from './react_embeddable_renderer';
import { ReactEmbeddableFactory } from './types';

describe('react embeddable renderer', () => {
  const testEmbeddableFactory: ReactEmbeddableFactory<{ name: string; bork: string }> = {
    type: 'test',
    deserializeState: jest.fn().mockImplementation((state) => state.rawState),
    buildEmbeddable: async (state, registerApi) => {
      const api = registerApi(
        {
          serializeState: () => ({
            rawState: {
              name: state.name,
              bork: state.bork,
            },
          }),
        },
        {
          name: [new BehaviorSubject<string>(state.name), () => {}],
          bork: [new BehaviorSubject<string>(state.bork), () => {}],
        }
      );
      return {
        Component: () => (
          <div>
            SUPER TEST COMPONENT, name: {state.name} bork: {state.bork}
          </div>
        ),
        api,
      };
    },
  };

  beforeAll(() => {
    registerReactEmbeddableFactory(testEmbeddableFactory);
  });

  it('deserializes given state', () => {
    render(<ReactEmbeddableRenderer type={'test'} state={{ rawState: { bork: 'blorp?' } }} />);
    expect(testEmbeddableFactory.deserializeState).toHaveBeenCalledWith({
      rawState: { bork: 'blorp?' },
    });
  });

  it('builds the embeddable', () => {
    const buildEmbeddableSpy = jest.spyOn(testEmbeddableFactory, 'buildEmbeddable');
    render(<ReactEmbeddableRenderer type={'test'} state={{ rawState: { bork: 'blorp?' } }} />);
    expect(buildEmbeddableSpy).toHaveBeenCalledWith({ bork: 'blorp?' }, expect.any(Function));
  });

  it('renders the given component once it resolves', () => {
    render(<ReactEmbeddableRenderer type={'test'} state={{ rawState: { name: 'Kuni Garu' } }} />);
    waitFor(() => {
      expect(screen.findByText('SUPER TEST COMPONENT, name: Kuni Garu')).toBeInTheDocument();
    });
  });

  it('publishes the API into the provided callback', async () => {
    const onApiAvailable = jest.fn();
    render(
      <ReactEmbeddableRenderer
        type={'test'}
        maybeId={'12345'}
        onApiAvailable={onApiAvailable}
        state={{ rawState: { name: 'Kuni Garu' } }}
      />
    );
    await waitFor(() =>
      expect(onApiAvailable).toHaveBeenCalledWith({
        type: 'test',
        uuid: '12345',
        parentApi: undefined,
        unsavedChanges: expect.any(Object),
        serializeState: expect.any(Function),
        resetUnsavedChanges: expect.any(Function),
      })
    );
  });

  it('initializes a new ID when one is not given', async () => {
    const onApiAvailable = jest.fn();
    render(
      <ReactEmbeddableRenderer
        type={'test'}
        onApiAvailable={onApiAvailable}
        state={{ rawState: { name: 'Kuni Garu' } }}
      />
    );
    await waitFor(() =>
      expect(onApiAvailable).toHaveBeenCalledWith(
        expect.objectContaining({ uuid: expect.any(String) })
      )
    );
  });

  it('registers the API with the parent API', async () => {
    const onApiAvailable = jest.fn();
    const parentApi = getMockPresentationContainer();
    render(
      <ReactEmbeddableRenderer
        type={'test'}
        maybeId={'12345'}
        parentApi={parentApi}
        onApiAvailable={onApiAvailable}
        state={{ rawState: { name: 'Kuni Garu' } }}
      />
    );
    await waitFor(() => {
      expect(onApiAvailable).toHaveBeenCalledWith(expect.objectContaining({ parentApi }));
      expect(parentApi.registerPanelApi).toHaveBeenCalledWith('12345', expect.any(Object));
    });
  });
});
