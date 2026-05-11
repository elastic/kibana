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
import { registerEmbeddablePublicDefinition } from './react_embeddable_registry';
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
      applySerializedState: jest.fn(),
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
    registerEmbeddablePublicDefinition('test', getTestEmbeddableFactory);
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
        initializeDrilldownsManager: expect.any(Function),
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
        initializeDrilldownsManager: expect.any(Function),
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
        initializeDrilldownsManager: expect.any(Function),
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
        applySerializedState: expect.any(Function),
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
      type: 'error_in_build_embeddable',
      buildEmbeddable: () => {
        throw new Error('error in buildEmbeddable');
      },
    };
    registerEmbeddablePublicDefinition('error_in_build_embeddable', () =>
      Promise.resolve(errorInInitializeFactory)
    );
    setupPresentationPanelServices();

    const onApiAvailable = jest.fn();
    // EuiThemeProvider is necessary to get around the complex way the error panel is rendered
    const embeddable = render(
      <EuiThemeProvider>
        <EmbeddableRenderer
          type={'error_in_build_embeddable'}
          maybeId={'12345'}
          onApiAvailable={onApiAvailable}
          getParentApi={() => ({
            getSerializedStateForChild: () => ({}),
          })}
        />
      </EuiThemeProvider>
    );

    await waitFor(() => expect(embeddable.getByTestId('errorMessageMarkdown')).toBeInTheDocument());
    expect(embeddable.getByTestId('errorMessageMarkdown')).toHaveTextContent(
      'error in buildEmbeddable'
    );
  });

  it('registers error API via onApiAvailable when buildEmbeddable throws', async () => {
    const errorFactory: EmbeddableFactory<{ name: string; bork: string }> = {
      ...testEmbeddableFactory,
      type: 'error_registers_api',
      buildEmbeddable: () => {
        throw new Error('saved object not found');
      },
    };
    registerEmbeddablePublicDefinition('error_registers_api', () => Promise.resolve(errorFactory));
    setupPresentationPanelServices();

    const onApiAvailable = jest.fn();
    render(
      <EuiThemeProvider>
        <EmbeddableRenderer
          type={'error_registers_api'}
          maybeId={'67890'}
          onApiAvailable={onApiAvailable}
          getParentApi={() => ({
            getSerializedStateForChild: () => ({}),
          })}
        />
      </EuiThemeProvider>
    );

    await waitFor(() => expect(onApiAvailable).toHaveBeenCalledTimes(1));

    const errorApi = onApiAvailable.mock.calls[0][0];
    expect(errorApi.uuid).toBe('67890');
    expect(errorApi.parentApi).toBeUndefined();
    expect(errorApi.blockingError$.getValue()).toEqual(new Error('saved object not found'));
  });

  it('assigns parentApi on error API when parent is a presentation container', async () => {
    const errorFactory: EmbeddableFactory<{ name: string; bork: string }> = {
      ...testEmbeddableFactory,
      type: 'error_with_container_parent',
      buildEmbeddable: () => {
        throw new Error('container parent error');
      },
    };
    registerEmbeddablePublicDefinition('error_with_container_parent', () =>
      Promise.resolve(errorFactory)
    );
    setupPresentationPanelServices();

    const parentApi = {
      ...getMockPresentationContainer(),
      getSerializedStateForChild: () => ({}),
    };
    const onApiAvailable = jest.fn();
    render(
      <EuiThemeProvider>
        <EmbeddableRenderer
          type={'error_with_container_parent'}
          maybeId={'99999'}
          onApiAvailable={onApiAvailable}
          getParentApi={() => parentApi}
        />
      </EuiThemeProvider>
    );

    await waitFor(() => expect(onApiAvailable).toHaveBeenCalledTimes(1));

    const errorApi = onApiAvailable.mock.calls[0][0];
    expect(errorApi.uuid).toBe('99999');
    expect(errorApi.parentApi).toBe(parentApi);
    expect(errorApi.blockingError$.getValue()).toEqual(new Error('container parent error'));
  });
});

describe('reactEmbeddable phase events', () => {
  it('publishes rendered phase immediately when dataLoading is not defined', async () => {
    const immediateLoadEmbeddableFactory: EmbeddableFactory<{ name: string; bork: string }> = {
      ...testEmbeddableFactory,
      type: 'immediate_load',
    };
    registerEmbeddablePublicDefinition('immediate_load', () =>
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
      type: 'load_clicker',
      buildEmbeddable: async ({ initialState, finalizeApi }) => {
        const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
        const api = finalizeApi({
          serializeState: () => ({
            name: initialState.name,
            bork: initialState.bork,
          }),
          applySerializedState: jest.fn(),
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
    registerEmbeddablePublicDefinition('load_clicker', () =>
      Promise.resolve(dataLoadingEmbeddableFactory)
    );
    setupPresentationPanelServices();

    const phaseFn = jest.fn();
    render(
      <EmbeddableRenderer
        type={'load_clicker'}
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
