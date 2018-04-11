import { store } from '../../store';
import {
  clearStagedFilters,
  setStagedFilter,
  embeddableIsInitialized,
  embeddableIsInitializing,
} from '../actions';

import {
  getStagedFilters,
} from '../../selectors';

beforeAll(() => {
  store.dispatch(embeddableIsInitializing('foo1'));
  store.dispatch(embeddableIsInitializing('foo2'));
  store.dispatch(embeddableIsInitialized({ panelId: 'foo1', metadata: {} }));
  store.dispatch(embeddableIsInitialized({ panelId: 'foo2', metadata: {} }));
});

describe('staged filters', () => {
  test('getStagedFilters initially is empty', () => {
    const stagedFilters = getStagedFilters(store.getState());
    expect(stagedFilters.length).toBe(0);
  });

  test('can set a staged filter', () => {
    store.dispatch(setStagedFilter({ stagedFilter: ['imafilter'], panelId: 'foo1' }));
    const stagedFilters = getStagedFilters(store.getState());
    expect(stagedFilters.length).toBe(1);
  });

  test('getStagedFilters returns filters for all embeddables', () => {
    store.dispatch(setStagedFilter({ stagedFilter: ['imafilter'], panelId: 'foo2' }));
    const stagedFilters = getStagedFilters(store.getState());
    expect(stagedFilters.length).toBe(2);
  });

  test('clearStagedFilters clears all filters', () => {
    store.dispatch(clearStagedFilters());
    const stagedFilters = getStagedFilters(store.getState());
    expect(stagedFilters.length).toBe(0);
  });
});

