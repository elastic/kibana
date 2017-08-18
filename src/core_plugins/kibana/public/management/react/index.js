/* eslint-disable */
import React, { Component } from 'react';
import { render } from 'react-dom';
import { connect, Provider } from 'react-redux';
import { Router, Route, Redirect, Switch, hashHistory } from 'react-router';
import thunk from 'redux-thunk';
import { createStore, compose, applyMiddleware } from 'redux';
import createHistory from 'history/lib/createHashHistory';
import { syncHistoryWithStore } from 'react-router-redux'
import { rootReducer } from './reducers';
import { initData } from './app/app.actions';
import globals from './globals';

import App from './app/index';
import IndexPattern from './index-pattern';

const initialState = {};
const store = compose(applyMiddleware(thunk))(createStore)(rootReducer, initialState);
const history = syncHistoryWithStore(hashHistory, store);

const ReactApp = {
  init: (kbnVersion, managementConfig, $injector) => {
    globals.es = $injector.get('es');
    store.dispatch(initData(kbnVersion, managementConfig));

    render(
      <Provider store={store}>
        <Router history={history}>
          <Redirect from="/management" to="/management/kibana/index"/>
          <Route path="/management" component={App}>
            <Route path="/management/kibana/index" component={IndexPattern}/>
          </Route>
        </Router>
      </Provider>,
      document.getElementById('managementApp')
    );
  }
};

export default ReactApp;
