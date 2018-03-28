import React from 'react';
import _ from 'lodash';
import { mount } from 'enzyme';
import { DashboardPanel } from './dashboard_panel';
import { DashboardViewMode } from '../dashboard_view_mode';
import { PanelError } from '../panel/panel_error';
import { store } from '../../store';
import { embeddableHandlerCache } from '../cache/embeddable_handler_cache';
import { Embeddable } from 'ui/embeddable';

import {
  updateViewMode,
  setPanels,
  updateTimeRange,
} from '../actions';
import { Provider } from 'react-redux';

import {
  takeMountedSnapshot,
} from '@elastic/eui/lib/test';

function getProps(props = {}) {
  const defaultTestProps = {
    panelId: 'foo1',
    initializeEmbeddable: jest.fn(),
    viewOnlyMode: false,
    destroy: () => {},
    initialized: true,
  };
  return _.defaultsDeep(props, defaultTestProps);
}

beforeAll(() => {
  store.dispatch(updateTimeRange({ to: 'now', from: 'now-15m' }));
  store.dispatch(updateViewMode(DashboardViewMode.EDIT));
  store.dispatch(setPanels({ 'foo1': { panelIndex: 'foo1' } }));
  embeddableHandlerCache.register('foo1', new Embeddable());
});

afterAll(() => {
  embeddableHandlerCache.destroy('foo1');
});

test('DashboardPanel matches snapshot', () => {
  const component = mount(<Provider store={store}><DashboardPanel {...getProps()} /></Provider>);
  expect(takeMountedSnapshot(component)).toMatchSnapshot();
});

test('Does not call initializeEmbeddable when initialized is true', () => {
  const props = getProps({ initialized: true });
  mount(<Provider store={store}><DashboardPanel {...props} /></Provider>);
  expect(props.initializeEmbeddable.mock.calls.length).toBe(0);
});

test('Calls initializeEmbeddable when initialized is false', () => {
  const props = getProps({ initialized: false });
  mount(<Provider store={store}><DashboardPanel {...props} /></Provider>);
  expect(props.initializeEmbeddable.mock.calls.length).toBe(1);
});

test('renders an error when error prop is passed', () => {
  const props = getProps({
    error: 'Simulated error'
  });

  const component = mount(<Provider store={store}><DashboardPanel {...props} /></Provider>);
  const panelError = component.find(PanelError);
  expect(panelError.length).toBe(1);
});
