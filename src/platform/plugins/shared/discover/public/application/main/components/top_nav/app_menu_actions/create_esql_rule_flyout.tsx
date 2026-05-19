/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { i18n } from '@kbn/i18n';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { DiscoverInternalState } from '../../../state_management/redux';
import { selectTab } from '../../../state_management/redux/selectors';
import type { DiscoverServices } from '../../../../../build_services';

const getEsqlQuery = (getState: () => DiscoverInternalState, tabId: string): string | null => {
  const { query } = selectTab(getState(), tabId).appState;
  if (!isOfAggregateQueryType(query)) {
    return null;
  }
  return query.esql;
};

const getEsqlVariables = (
  getState: () => DiscoverInternalState,
  tabId: string
): ESQLControlVariable[] | undefined => selectTab(getState(), tabId).esqlVariables;

export function CreateESQLRuleFlyout({
  services,
  tabId,
  getState,
  subscribe,
  onClose,
}: {
  services: DiscoverServices;
  tabId: string;
  getState: () => DiscoverInternalState;
  subscribe: (listener: () => void) => () => void;
  onClose: () => void;
}) {
  const getQuery = useCallback(() => getEsqlQuery(getState, tabId), [getState, tabId]);
  const getVariables = useCallback(() => getEsqlVariables(getState, tabId), [getState, tabId]);

  const query = useSyncExternalStore(subscribe, getQuery);
  const esqlVariables = useSyncExternalStore(subscribe, getVariables);

  const { history, core, alertingVTwo } = services;
  const RuleFormFlyout = alertingVTwo!.DynamicRuleFormFlyout;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const initialPathnameRef = useRef(history.location.pathname);

  useEffect(() => {
    if (query === null) {
      core.notifications.toasts.addDanger(
        i18n.translate('discover.alerts.esqlRuleFlyout.queryTypeError', {
          defaultMessage: 'Unable to create an ES|QL rule: the current query is not ES|QL.',
        })
      );
      onCloseRef.current();
    }
  }, [query, core.notifications.toasts]);

  useEffect(() => {
    const unlisten = history.listen((location) => {
      if (location.pathname !== initialPathnameRef.current) {
        onCloseRef.current();
      }
    });

    const appChangeSubscription = core.application.currentAppId$.subscribe((appId) => {
      if (appId && appId !== 'discover') {
        onCloseRef.current();
      }
    });

    return () => {
      unlisten();
      appChangeSubscription.unsubscribe();
    };
  }, [history, core.application.currentAppId$]);

  if (query === null) {
    return null;
  }

  return <RuleFormFlyout query={query} onClose={onClose} esqlVariables={esqlVariables} />;
}
