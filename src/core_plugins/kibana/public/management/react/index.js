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
} from './store/actions/index-pattern-list';

import {
  fetchIndices,
} from './store/actions/index-pattern-creation';

import {
  fetchIndexPattern,
} from './store/actions/index-pattern-view';

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

  getStore: () => store,

  setGlobals: $injector => {
    globals.es = $injector.get('es');
    globals.indexPatterns = $injector.get('indexPatterns');
    globals.config = $injector.get('config');
    globals.kbnUrl = $injector.get('kbnUrl');
    globals.$rootScope = $injector.get('$rootScope');
    globals.$http = $injector.get('$http');
  },

  renderIndexPatternCreate: targetId => {
    store.dispatch(fetchIndices('*', true));
    renderPage(<IndexPatternCreate/>, targetId);
  },
  renderIndexPatternList: targetId => {
    store.dispatch(fetchIndexPatterns());
    renderPage(<IndexPatternList/>, targetId);
  },
  renderIndexPatternView: (targetId, pattern) => {
    store.dispatch(fetchIndexPattern(pattern));
    renderPage(<IndexPatternView/>, targetId);
  }
};

export { ReactApp };
