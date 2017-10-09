import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { initData } from './app/app.actions';
import { globals } from './globals';
import { store } from './store';

import { App } from './app/index';
import {
  IndexPatternCreate,
  IndexPatternList,
  IndexPatternView,
} from './index-pattern';

import {
  fetchIndexPatterns,
} from 'plugins/kibana/management/react/store/actions/index-pattern-list';

import {
  getIndexPatterns,
} from 'plugins/kibana/management/react/store/reducers/index-pattern-list';

const renderPage = (page, targetId) => {
  render(
    <Provider store={store}>
      <App>
        {page}
      </App>
    </Provider>,
    document.getElementById(targetId)
  );
};

const ReactApp = {
  init: ($injector, managementConfig) => {
    ReactApp.setGlobals($injector);
    const kbnVersion = $injector.get('kbnVersion');
    store.dispatch(initData(kbnVersion, managementConfig));
  },

  setGlobals: $injector => {
    globals.es = $injector.get('es');
    globals.indexPatterns = $injector.get('indexPatterns');
    globals.config = $injector.get('config');
    globals.kbnUrl = $injector.get('kbnUrl');
    globals.$rootScope = $injector.get('$rootScope');
    globals.$http = $injector.get('$http');
  },

  hasAnyIndexPatterns: async () => {
    const { getState, dispatch } = store;
    await fetchIndexPatterns()(dispatch, getState);
    const indexPatterns = getIndexPatterns(getState());
    return indexPatterns.length > 0;
  },

  renderIndexPatternCreate: targetId => {
    renderPage(<IndexPatternCreate/>, targetId);
  },
  renderIndexPatternList: targetId => {
    renderPage(<IndexPatternList/>, targetId);
  },
  renderIndexPatternView: (targetId, pattern) => {
    renderPage(<IndexPatternView pattern={pattern}/>, targetId);
  }
};

export { ReactApp };
