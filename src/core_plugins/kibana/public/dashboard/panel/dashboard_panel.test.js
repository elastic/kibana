import React from 'react';
import _ from 'lodash';
import { mount } from 'enzyme';
import { DashboardPanel } from './dashboard_panel';
import { DashboardViewMode } from '../dashboard_view_mode';
import { PanelError } from '../panel/panel_error';
import { store } from '../../store';
import { updateViewMode } from '../actions';
import { Provider } from 'react-redux';
import { getEmbeddableHandlerMock } from '../__tests__/get_embeddable_handlers_mock.test';

import {
  takeMountedSnapshot,
} from 'ui_framework/src/test';

function getProps(props = {}) {
  const defaultTestProps = {
    panel: { panelIndex: 'foo1' },
    renderEmbeddable: jest.fn(),
    viewOnlyMode: false,
    onDestroy: () => {},
    embeddableHandler: getEmbeddableHandlerMock(),
  };
  return _.defaultsDeep(props, defaultTestProps);
}

beforeAll(() => {
  store.dispatch(updateViewMode(DashboardViewMode.EDIT));
});

test('DashboardPanel matches snapshot', () => {
  const component = mount(<Provider store={store}><DashboardPanel {...getProps()} /></Provider>);
  expect(takeMountedSnapshot(component)).toMatchSnapshot();
});

test('Calls render', () => {
  const props = getProps();
  mount(<Provider store={store}><DashboardPanel {...props} /></Provider>);
  expect(props.renderEmbeddable.mock.calls.length).toBe(1);
});

test('renders an error when error prop is passed', () => {
  const props = getProps({
    error: 'Simulated error'
  });

  const component = mount(<Provider store={store}><DashboardPanel {...props} /></Provider>);
  const panelError = component.find(PanelError);
  expect(panelError.length).toBe(1);
});

