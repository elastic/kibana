/* eslint-disable */
import React, { Component } from 'react';
import { render } from 'react-dom';
import { connect, Provider } from 'react-redux';
import { Router, Route, Redirect, Switch, IndexRoute, hashHistory } from 'react-router';
import thunk from 'redux-thunk';
import { createStore, compose, applyMiddleware } from 'redux';
import createHistory from 'history/lib/createHashHistory';
import { syncHistoryWithStore } from 'react-router-redux'
import { rootReducer } from './reducers';
import { initData } from './app/app.actions';
import globals from './globals';

import App from './app/index';
import IndexPatternRedirect from './index-pattern';
import IndexPatternCreate from './index-pattern/components/index-pattern-create';
import IndexPatternList from './index-pattern/components/index-pattern-list';

const initialState = {};
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const store = composeEnhancers(applyMiddleware(thunk))(createStore)(rootReducer, initialState);
const history = syncHistoryWithStore(hashHistory, store);

const ReactApp = {
  init: (kbnVersion, managementConfig, $injector) => {
    globals.es = $injector.get('es');
    globals.indexPatterns = $injector.get('indexPatterns');
    globals.config = $injector.get('config');
    globals.kbnUrl = $injector.get('kbnUrl');
    globals.$http = $injector.get('$http');

    store.dispatch(initData(kbnVersion, managementConfig));

    render(
      <Provider store={store}>
        <Router history={history}>
           <Route path="/management" component={App}>
            <Route path="/management/kibana/indices/:patternId" component={IndexPatternList}/>
            <Route path="/management/kibana/index*" component={IndexPatternCreate}/>
            <IndexRoute component={IndexPatternRedirect}/>
          </Route>
        </Router>
      </Provider>,
      document.getElementById('managementApp')
    );
  }
};

export default ReactApp;
