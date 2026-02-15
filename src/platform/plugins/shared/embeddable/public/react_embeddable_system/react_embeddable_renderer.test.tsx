/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMockPresentationContainer } from '@kbn/presentation-publishing/interfaces/containers/mocks';
import { setStubKibanaServices as setupPresentationPanelServices } from '@kbn/presentation-panel-plugin/public/mocks';
import { render, waitFor, screen, fireEvent } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { registerReactEmbeddableFactory } from './react_embeddable_registry';
import { EmbeddableRenderer } from './react_embeddable_renderer';
import type { EmbeddableFactory } from './types';

const testEmbeddableFactory: EmbeddableFactory<{ name: string; bork: string }> = {
  type: 'test',
  buildEmbeddable: async ({ initialState, finalizeApi }) => {
    const api = finalizeApi({
      serializeState: () => ({
        name: initialState.name,
        bork: initialState.bork,
      }),
    });
    return {
      Component: () => (
        <div data-test-subj="superTestEmbeddable">
          SUPER TEST COMPONENT, name: {initialState.name} bork: {initialState.bork}
        </div>
      ),
      api,
    };
  },
};

describe('embeddable renderer', () => {
  const getTestEmbeddableFactory = async () => {
    return testEmbeddableFactory;
  };

  beforeAll(() => {
    registerReactEmbeddableFactory('test', getTestEmbeddableFactory);
    setupPresentationPanelServices();
  });

  it('builds the embeddable', async () => {
    const buildEmbeddableSpy = jest.spyOn(testEmbeddableFactory, 'buildEmbeddable');
    render(
      <EmbeddableRenderer
        type={'test'}
        getParentApi={() => ({
          getSerializedStateForChild: () => ({
            bork: 'blorp?',
          }),
        })}
      />
    );
    await waitFor(() => {
      expect(buildEmbeddableSpy).toHaveBeenCalledWith({
        initialState: { bork: 'blorp?' },
        parentApi: expect.any(Object),
        uuid: expect.any(String),
        finalizeApi: expect.any(Function),
      });
    });
  });

  it('builds the embeddable, providing an id', async () => {
    const buildEmbeddableSpy = jest.spyOn(testEmbeddableFactory, 'buildEmbeddable');
    render(
      <EmbeddableRenderer
        type={'test'}
        maybeId={'12345'}
        getParentApi={() => ({
          getSerializedStateForChild: () => ({
            bork: 'blorp?',
          }),
        })}
      />
    );
    await waitFor(() => {
      expect(buildEmbeddableSpy).toHaveBeenCalledWith({
        initialState: { bork: 'blorp?' },
        parentApi: expect.any(Object),
        uuid: '12345',
        finalizeApi: expect.any(Function),
      });
    });
  });

  it('builds the embeddable, providing a parent', async () => {
    const buildEmbeddableSpy = jest.spyOn(testEmbeddableFactory, 'buildEmbeddable');
    const parentApi = {
      ...getMockPresentationContainer(),
      getSerializedStateForChild: () => ({
        bork: 'blorp?',
      }),
    };
    render(<EmbeddableRenderer type={'test'} getParentApi={() => parentApi} />);
    await waitFor(() => {
      expect(buildEmbeddableSpy).toHaveBeenCalledWith({
        initialState: { bork: 'blorp?' },
        parentApi,
        uuid: expect.any(String),
        finalizeApi: expect.any(Function),
      });
    });
  });

  it('renders the given component once it resolves', async () => {
    render(
      <EmbeddableRenderer
        type={'test'}
        getParentApi={() => ({
          getSerializedStateForChild: () => ({
            name: 'Kuni Garu',
            bork: 'Dara',
          }),
        })}
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
      <EmbeddableRenderer
        type={'test'}
        maybeId={'12345'}
        onApiAvailable={onApiAvailable}
        getParentApi={() => ({
          getSerializedStateForChild: () => ({
            name: 'Kuni Garu',
          }),
        })}
      />
    );
    await waitFor(() =>
      expect(onApiAvailable).toHaveBeenCalledWith({
        type: 'test',
        uuid: '12345',
        parentApi: expect.any(Object),
        serializeState: expect.any(Function),
        phase$: expect.any(Object),
        hasLockedHoverActions$: expect.any(Object),
        lockHoverActions: expect.any(Function),
        isCustomizable: true,
        isDuplicable: true,
        isExpandable: true,
        isPinnable: false,
      })
    );
  });

  it('initializes a new ID when one is not given', async () => {
    const onApiAvailable = jest.fn();
    render(
      <EmbeddableRenderer
        type={'test'}
        onApiAvailable={onApiAvailable}
        getParentApi={() => ({
          getSerializedStateForChild: () => ({
            name: 'Kuni Garu',
          }),
        })}
      />
    );
    await waitFor(() =>
      expect(onApiAvailable).toHaveBeenCalledWith(
        expect.objectContaining({ uuid: expect.any(String) })
      )
    );
  });

  it('catches error when thrown in buildEmbeddable', async () => {
    const errorInInitializeFactory: EmbeddableFactory<{ name: string; bork: string }> = {
      ...testEmbeddableFactory,
      type: 'errorInBuildEmbeddable',
      buildEmbeddable: () => {
        throw new Error('error in buildEmbeddable');
      },
    };
    registerReactEmbeddableFactory('errorInBuildEmbeddable', () =>
      Promise.resolve(errorInInitializeFactory)
    );
    setupPresentationPanelServices();

    const onApiAvailable = jest.fn();
    // EuiThemeProvider is necessary to get around the complex way the error panel is rendered
    const embeddable = render(
      <EuiThemeProvider>
        <EmbeddableRenderer
          type={'errorInBuildEmbeddable'}
          maybeId={'12345'}
          onApiAvailable={onApiAvailable}
          getParentApi={() => ({
            getSerializedStateForChild: () => ({}),
          })}
        />
      </EuiThemeProvider>
    );

    await waitFor(() => expect(embeddable.getByTestId('errorMessageMarkdown')).toBeInTheDocument());
    expect(onApiAvailable).not.toBeCalled();
    expect(embeddable.getByTestId('errorMessageMarkdown')).toHaveTextContent(
      'error in buildEmbeddable'
    );
  });
});

describe('reactEmbeddable phase events', () => {
  it('publishes rendered phase immediately when dataLoading is not defined', async () => {
    const immediateLoadEmbeddableFactory: EmbeddableFactory<{ name: string; bork: string }> = {
      ...testEmbeddableFactory,
      type: 'immediateLoad',
    };
    registerReactEmbeddableFactory('immediateLoad', () =>
      Promise.resolve(immediateLoadEmbeddableFactory)
    );
    setupPresentationPanelServices();

    const renderedEvent = jest.fn();
    render(
      <EmbeddableRenderer
        type={'test'}
        maybeId={'12345'}
        onApiAvailable={(api) => {
          api.phase$.subscribe((phase) => {
            if (phase?.status === 'rendered') {
              renderedEvent();
            }
          });
        }}
        getParentApi={() => ({
          getSerializedStateForChild: () => ({
            name: 'Kuni Garu',
          }),
        })}
      />
    );
    await waitFor(() => expect(renderedEvent).toHaveBeenCalled());
  });

  it('publishes rendered phase event when dataLoading is complete', async () => {
    const dataLoadingEmbeddableFactory: EmbeddableFactory<{ name: string; bork: string }> = {
      ...testEmbeddableFactory,
      type: 'loadClicker',
      buildEmbeddable: async ({ initialState, finalizeApi }) => {
        const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
        const api = finalizeApi({
          serializeState: () => ({
            name: initialState.name,
            bork: initialState.bork,
          }),
          dataLoading$,
        });
        return {
          Component: () => (
            <>
              <div data-test-subj="superTestEmbeddable">
                SUPER TEST COMPONENT, name: {initialState.name} bork: {initialState.bork}
              </div>
              <button data-test-subj="clickToStopLoading" onClick={() => dataLoading$.next(false)}>
                Done loading
              </button>
            </>
          ),
          api,
        };
      },
    };
    registerReactEmbeddableFactory('loadClicker', () =>
      Promise.resolve(dataLoadingEmbeddableFactory)
    );
    setupPresentationPanelServices();

    const phaseFn = jest.fn();
    render(
      <EmbeddableRenderer
        type={'loadClicker'}
        maybeId={'12345'}
        onApiAvailable={(api) => {
          api.phase$.subscribe((phase) => {
            phaseFn(phase);
          });
        }}
        getParentApi={() => ({
          getSerializedStateForChild: () => ({
            name: 'Kuni Garu',
          }),
        })}
      />
    );
    await waitFor(() => {
      expect(phaseFn).toHaveBeenCalledWith(expect.objectContaining({ status: 'loading' }));
    });
    await fireEvent.click(screen.getByTestId('clickToStopLoading'));
    await waitFor(() => {
      expect(phaseFn).toHaveBeenCalledWith(expect.objectContaining({ status: 'rendered' }));
    });
  });
});
