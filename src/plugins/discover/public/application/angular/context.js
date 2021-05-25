/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  CONTEXT_DEFAULT_SIZE_SETTING,
  CONTEXT_STEP_SETTING,
  CONTEXT_TIE_BREAKER_FIELDS_SETTING,
  SEARCH_FIELDS_FROM_SOURCE,
} from '../../../common';
import { getAngularModule, getServices } from '../../kibana_services';
import './context_app';
import { getState } from './context_state';
import contextAppRouteTemplate from './context.html';
import { getRootBreadcrumbs } from '../helpers/breadcrumbs';
import { getContextQueryDefaults } from './context_query_state';
import { getFirstSortableField } from './context/api/utils/sorting';

const k7Breadcrumbs = ($route) => {
  const { indexPattern } = $route.current.locals;
  const { id } = $route.current.params;

  return [
    ...getRootBreadcrumbs(),
    {
      text: i18n.translate('discover.context.breadcrumb', {
        defaultMessage: 'Context of {indexPatternTitle}#{docId}',
        values: {
          indexPatternTitle: indexPattern.title,
          docId: id,
        },
      }),
    },
  ];
};

getAngularModule().config(($routeProvider) => {
  $routeProvider.when('/context/:indexPatternId/:id*', {
    controller: ContextAppRouteController,
    k7Breadcrumbs,
    controllerAs: 'contextAppRoute',
    resolve: {
      indexPattern: ($route, Promise) => {
        const indexPattern = getServices().indexPatterns.get($route.current.params.indexPatternId);
        return Promise.props({ ip: indexPattern });
      },
    },
    template: contextAppRouteTemplate,
  });
});

function ContextAppRouteController($routeParams, $scope, $route) {
  this.indexPattern = $route.current.locals.indexPattern.ip;
  this.anchorId = $routeParams.id;
  this.indexPatternId = $route.current.params.indexPatternId;
  const { uiSettings, history, core } = getServices();
  const filterManager = getServices().filterManager;

  const stateContainer = getState({
    defaultStepSize: parseInt(uiSettings.get(CONTEXT_DEFAULT_SIZE_SETTING), 10),
    timeFieldName: this.indexPattern.timeFieldName,
    storeInSessionStorage: uiSettings.get('state:storeInSessionStorage'),
    history: history(),
    toasts: core.notifications.toasts,
    uiSettings: core.uiSettings,
    getContextQueryDefaults: () =>
      getContextQueryDefaults(
        this.indexPatternId,
        this.anchorId,
        parseInt(uiSettings.get(CONTEXT_STEP_SETTING), 10),
        getFirstSortableField(
          this.indexPattern,
          uiSettings.get(CONTEXT_TIE_BREAKER_FIELDS_SETTING)
        ),
        !uiSettings.get(SEARCH_FIELDS_FROM_SOURCE)
      ),
  });
  const {
    startSync: startStateSync,
    stopSync: stopStateSync,
    appState,
    getFilters,
    setFilters,
    setAppState,
    flushToUrl,
  } = stateContainer;
  this.stateContainer = stateContainer;
  this.state = { ...appState.getState() };
  filterManager.setFilters(_.cloneDeep(getFilters()));
  startStateSync();

  // take care of parameter changes in UI
  $scope.$watchGroup(
    [
      'contextAppRoute.state.columns',
      'contextAppRoute.state.predecessorCount',
      'contextAppRoute.state.successorCount',
    ],
    (newValues) => {
      const [columns, predecessorCount, successorCount] = newValues;
      if (Array.isArray(columns) && predecessorCount >= 0 && successorCount >= 0) {
        setAppState({ columns, predecessorCount, successorCount });
        flushToUrl(true);
      }
    }
  );
  // take care of parameter filter changes
  const filterObservable = filterManager.getUpdates$().subscribe(() => {
    setFilters(filterManager);
    $route.reload();
  });

  $scope.$on('$destroy', () => {
    stopStateSync();
    filterObservable.unsubscribe();
  });
}
