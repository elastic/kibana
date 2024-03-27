/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { getMockPresentationContainer } from '@kbn/presentation-containers/mocks';
import { setStubKibanaServices as setupPresentationPanelServices } from '@kbn/presentation-panel-plugin/public/mocks';
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
          <div data-test-subj="superTestEmbeddable">
            SUPER TEST COMPONENT, name: {state.name} bork: {state.bork}
          </div>
        ),
        api,
      };
    },
  };

  const getTestEmbeddableFactory = async () => {
    return testEmbeddableFactory;
  };

  beforeAll(() => {
    registerReactEmbeddableFactory('test', getTestEmbeddableFactory);
    setupPresentationPanelServices();
  });

  it('deserializes given state', async () => {
    render(<ReactEmbeddableRenderer type={'test'} state={{ rawState: { bork: 'blorp?' } }} />);
    await waitFor(() => {
      expect(testEmbeddableFactory.deserializeState).toHaveBeenCalledWith({
        rawState: { bork: 'blorp?' },
      });
    });
  });

  it('builds the embeddable', async () => {
    const buildEmbeddableSpy = jest.spyOn(testEmbeddableFactory, 'buildEmbeddable');
    render(<ReactEmbeddableRenderer type={'test'} state={{ rawState: { bork: 'blorp?' } }} />);
    await waitFor(() => {
      expect(buildEmbeddableSpy).toHaveBeenCalledWith(
        { bork: 'blorp?' },
        expect.any(Function),
        expect.any(String),
        undefined
      );
    });
  });

  it('builds the embeddable, providing an id', async () => {
    const buildEmbeddableSpy = jest.spyOn(testEmbeddableFactory, 'buildEmbeddable');
    render(
      <ReactEmbeddableRenderer
        type={'test'}
        maybeId={'12345'}
        state={{ rawState: { bork: 'blorp?' } }}
      />
    );
    await waitFor(() => {
      expect(buildEmbeddableSpy).toHaveBeenCalledWith(
        { bork: 'blorp?' },
        expect.any(Function),
        '12345',
        undefined
      );
    });
  });

  it('builds the embeddable, providing a parent', async () => {
    const buildEmbeddableSpy = jest.spyOn(testEmbeddableFactory, 'buildEmbeddable');
    const parentApi = getMockPresentationContainer();
    render(
      <ReactEmbeddableRenderer
        type={'test'}
        state={{ rawState: { bork: 'blorp?' } }}
        parentApi={parentApi}
      />
    );
    await waitFor(() => {
      expect(buildEmbeddableSpy).toHaveBeenCalledWith(
        { bork: 'blorp?' },
        expect.any(Function),
        expect.any(String),
        parentApi
      );
    });
  });

  it('renders the given component once it resolves', async () => {
    render(
      <ReactEmbeddableRenderer
        type={'test'}
        state={{ rawState: { name: 'Kuni Garu', bork: 'Dara' } }}
      />
    );
    await waitFor(() => {
      expect(screen.queryByTestId<HTMLElement>('superTestEmbeddable')).toHaveTextContent(
        'SUPER TEST COMPONENT, name: Kuni Garu bork: Dara'
      );
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
