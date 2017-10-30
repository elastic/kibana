import { store } from '../../store';
import { embeddableRenderError, embeddableRenderFinished } from '../actions';
import {
  getEmbeddableError,
  getEmbeddableTitle,
  getEmbeddableEditUrl,
} from '../../selectors';

test('embeddableRenderError stores an error on the embeddable', () => {
  store.dispatch(embeddableRenderError('1', new Error('Opps, something bad happened!')));

  const error = getEmbeddableError(store.getState(), '1');
  expect(error.message).toBe('Opps, something bad happened!');
});

describe('embeddableRenderFinished', () => {
  test('stores a new embeddable object and clears the error', () => {
    store.dispatch(embeddableRenderFinished('1', { title: 'My Embeddable' }));
    const embeddableTitle = getEmbeddableTitle(store.getState(), '1');
    expect(embeddableTitle).toBe('My Embeddable');
  });

  test('and clears the error', () => {
    const error = getEmbeddableError(store.getState(), '1');
    expect(error).toBe(undefined);
  });

  test('getEmbeddableEditUrl', () => {
    store.dispatch(embeddableRenderFinished('1', { title: 'My Embeddable', editUrl: 'vis/edit/me' }));
    const url = getEmbeddableEditUrl(store.getState(), '1');
    expect(url).toBe('vis/edit/me');
  });
});
