import { store } from '../../store';
import {
  embeddableIsInitializing, setPanels,
} from '../actions';
import {
  getEmbeddableError,
  getEmbeddableInitialized,
} from '../../selectors';

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

