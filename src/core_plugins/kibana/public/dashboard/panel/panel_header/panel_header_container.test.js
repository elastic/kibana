import React from 'react';
import { Provider } from 'react-redux';
import _ from 'lodash';
import { mount } from 'enzyme';

import { PanelHeaderContainer } from './panel_header_container';
import { DashboardViewMode } from '../../dashboard_view_mode';
import { store } from '../../../store';
import {
  updateViewMode,
  setPanels,
  setPanelTitle,
  resetPanelTitle,
  embeddableRenderFinished,
} from '../../actions';
import { getEmbeddableFactoryMock } from '../../__tests__/get_embeddable_factories_mock';
import { findTestSubject } from '@elastic/eui/lib/test';

function getProps(props = {}) {
  const defaultTestProps = {
    panelId: 'foo1',
    embeddableFactory: getEmbeddableFactoryMock(),
  };
  return _.defaultsDeep(props, defaultTestProps);
}

let component;

beforeAll(() => {
  store.dispatch(updateViewMode(DashboardViewMode.EDIT));
  store.dispatch(setPanels({ 'foo1': { panelIndex: 'foo1' } }));
  store.dispatch(embeddableRenderFinished('foo1', { title: 'my embeddable title', editUrl: 'editme' }));
});

afterAll(() => {
  component.unmount();
});

test('Panel header shows embeddable title when nothing is set on the panel', () => {
  component = mount(<Provider store={store}><PanelHeaderContainer {...getProps()} /></Provider>);
  expect(findTestSubject(component, 'dashboardPanelTitle').text()).toBe('my embeddable title');
});

test('Panel header shows panel title when it is set on the panel', () => {
  store.dispatch(setPanelTitle('my custom panel title', 'foo1'));
  expect(findTestSubject(component, 'dashboardPanelTitle').text()).toBe('my custom panel title');
});

test('Panel header shows no panel title when it is set to an empty string on the panel', () => {
  store.dispatch(setPanelTitle('', 'foo1'));
  expect(findTestSubject(component, 'dashboardPanelTitle').text()).toBe('');
});

test('Panel header shows embeddable title when the panel title is reset', () => {
  store.dispatch(resetPanelTitle('foo1'));
  expect(findTestSubject(component, 'dashboardPanelTitle').text()).toBe('my embeddable title');
});
