import { store } from '../../store';
import { Embeddable } from 'ui/embeddable';
import {
  initializeEmbeddable,
  embeddableIsInitializing, setPanels,
} from '../actions';
import {
  getEmbeddableError,
  getEmbeddableInitialized,
} from '../../selectors';

import { getEmbeddableFactoryMock } from '../__tests__/get_embeddable_factories_mock';
import { embeddableHandlerCache } from '../cache/embeddable_handler_cache';

beforeAll(() => {
  store.dispatch(setPanels({ 'foo1': { panelIndex: 'foo1' } }));
});

describe('embeddableIsInitializing', () => {
  test('clears the error', () => {
    store.dispatch(embeddableIsInitializing('foo1'));
    const initialized = getEmbeddableInitialized(store.getState(), 'foo1');
    expect(initialized).toBe(false);
  });

  test('and clears the error', () => {
    const error = getEmbeddableError(store.getState(), 'foo1');
    expect(error).toBe(undefined);
  });
});

describe('initializeEmbeddable with an exception', () => {
  beforeAll(() => {
    const embeddableFactory = getEmbeddableFactoryMock({
      create: () => new Promise(() => {
        throw new Error('error!');
      })
    });
    store.dispatch(initializeEmbeddable({ embeddableFactory, panelId: 'foo1' }));
  });

  test('sets an error', () => {
    const error = getEmbeddableError(store.getState(), 'foo1');
    expect(error).toBe('error!');
  });

  test('sets initialized to false', () => {
    const initialized = getEmbeddableInitialized(store.getState(), 'foo1');
    expect(initialized).toBe(false);
  });
});

describe('initializeEmbeddable with no errors', () => {
  beforeAll(() => {
    const embeddableFactory = getEmbeddableFactoryMock({
      create: () => Promise.resolve(new Embeddable({ metadata: { title: 'hi!' } }))
    });
    store.dispatch(initializeEmbeddable({ embeddableFactory, panelId: 'foo1' }));
  });

  test('clears the error', () => {
    const error = getEmbeddableError(store.getState(), 'foo1');
    expect(error).toBe(undefined);
  });

  test('sets initialized to true', () => {
    const initialized = getEmbeddableInitialized(store.getState(), 'foo1');
    expect(initialized).toBe(true);
  });

  test('stores the embeddable in the cache', () => {
    const metadata = embeddableHandlerCache.getMetadata('foo1');
    expect(metadata.title).toBe('hi!');
  });
});
