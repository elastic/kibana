import React from 'react';
import _ from 'lodash';
import { mount } from 'enzyme';
import { EmbeddableViewport } from './embeddable_viewport';
import { DashboardViewMode } from '../dashboard_view_mode';
import { store } from '../../store';

import {
  updateViewMode,
  setPanels,
  updateTimeRange,
} from '../actions';
import { Provider } from 'react-redux';

import {
  takeMountedSnapshot,
} from '@elastic/eui/lib/test';

import { getEmbeddableFactoryMock } from '../__tests__/get_embeddable_factories_mock';

function getProps(props = {}) {
  const defaultTestProps = {
    panel: { panelIndex: 'foo1' },
    embeddableIsInitializing: jest.fn(),
    initialized: true,
    embeddableFactory: getEmbeddableFactoryMock(),
    embeddableIsInitialized: jest.fn(),
    embeddableError: jest.fn(),
    embeddableStateChanged: jest.fn(),
  };
  return _.defaultsDeep(props, defaultTestProps);
}

beforeAll(() => {
  store.dispatch(updateTimeRange({ to: 'now', from: 'now-15m' }));
  store.dispatch(updateViewMode(DashboardViewMode.EDIT));
  store.dispatch(setPanels({ 'foo1': { panelIndex: 'foo1' } }));
});

test('EmbeddableViewport matches snapshot', () => {
  const component = mount(<Provider store={store}><EmbeddableViewport {...getProps()} /></Provider>);
  expect(takeMountedSnapshot(component)).toMatchSnapshot();
});

test('Does not call embeddableIsInitialized when initialized is true', () => {
  const props = getProps({ initialized: true });
  mount(<Provider store={store}><EmbeddableViewport {...props} /></Provider>);
  expect(props.embeddableIsInitialized.mock.calls.length).toBe(0);
});

test('Calls embeddadbleIsInitializing when initialized is false', () => {
  const props = getProps({ initialized: false });
  mount(<Provider store={store}><EmbeddableViewport {...props} /></Provider>);
  expect(props.embeddableIsInitializing.mock.calls.length).toBe(1);
});
