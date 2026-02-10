/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState, useRef, useMemo } from 'react';
import type { DataView } from '@kbn/data-plugin/common';
import type { AggregateQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { DiscoverAppMenuItemType } from '@kbn/discover-utils';
import { AppMenuActionId } from '@kbn/discover-utils';
import { ESQLRuleFormFlyout } from '@kbn/alerting-v2-rule-form';
import { type Observable, type BehaviorSubject, filter, map, pairwise, startWith } from 'rxjs';
import type { DiscoverStateContainer } from '../../../state_management/discover_state';
import type { AppMenuDiscoverParams } from './types';
import type { DiscoverServices } from '../../../../../build_services';
import type { DiscoverAppState } from '../../../state_management/redux';
import type { DataMainMsg } from '../../../state_management/discover_data_state_container';

export function CreateESQLRuleFlyout({
  discoverParams,
  services,
  stateContainer,
  onClose,
}: {
  discoverParams: AppMenuDiscoverParams;
  services: DiscoverServices;
  stateContainer: DiscoverStateContainer;
  onClose: () => void;
}) {
  const { dataView } = discoverParams;
  const timeField = getTimeField(dataView);
  const [query, setQuery] = useState<string>(
    (stateContainer.getCurrentTab().appState.query as AggregateQuery)?.esql || ''
  );

  const { http, data, dataViews, notifications, history } = services;
  const [queryError, setQueryError] = useState<Error | undefined>(undefined);

  // Use a ref to avoid stale closure issues with onClose
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Track the initial pathname to detect actual navigation (not just query param changes)
  const initialPathnameRef = useRef(history.location.pathname);

  // Create the app state observable once and memoize it
  const appState$ = useMemo(() => stateContainer.createAppStateObservable(), [stateContainer]);

  useEffect(() => {
    const querySubscription = createAppStateObservable(appState$).subscribe((changes) => {
      if (changes.query) {
        setQuery((changes.query as AggregateQuery)?.esql || '');
      }
    });
    const queryErrorSubscription = createDataStateObservable(
      stateContainer.dataState.data$.main$
    ).subscribe((changes) => {
      setQueryError(changes.error);
    });

    // Listen for route changes to close the flyout
    // Only close on actual navigation (pathname change), not query param changes
    const unlisten = history.listen((location) => {
      if (location.pathname !== initialPathnameRef.current) {
        onCloseRef.current();
      }
    });

    return () => {
      querySubscription.unsubscribe();
      queryErrorSubscription.unsubscribe();
      unlisten();
    };
  }, [appState$, stateContainer.dataState.data$.main$, history]);

  return (
    <ESQLRuleFormFlyout
      defaultTimeField={timeField}
      services={{
        http,
        data,
        dataViews,
        notifications,
      }}
      query={query}
      onClose={onClose}
      isQueryInvalid={Boolean(queryError)}
    />
  );
}

export const getCreateRuleMenuItem = ({
  discoverParams,
  services,
  stateContainer,
}: {
  discoverParams: AppMenuDiscoverParams;
  services: DiscoverServices;
  stateContainer: DiscoverStateContainer;
}): DiscoverAppMenuItemType => {
  return {
    id: AppMenuActionId.createRule,
    order: 3,
    label: i18n.translate('discover.localMenu.ruleTitle', {
      defaultMessage: 'Create Rule',
    }),
    iconType: 'bell',
    testId: 'discoverESQLRuleButton',
    tooltipContent: i18n.translate('discover.localMenu.ruleDescription', {
      defaultMessage: 'Create an ES|QL alerting rule',
    }),
    run: ({ context: { onFinishAction } }) => {
      return (
        <CreateESQLRuleFlyout
          discoverParams={discoverParams}
          services={services}
          stateContainer={stateContainer}
          onClose={onFinishAction}
        />
      );
    },
  };
};

function getTimeField(dataView: DataView | undefined) {
  const dateFields = dataView?.fields.getByType('date');
  return dataView?.timeFieldName || dateFields?.[0]?.name;
}

const createAppStateObservable = (state$: Observable<DiscoverAppState>) => {
  return state$.pipe(
    startWith(undefined),
    pairwise(),
    map(([prev, curr]) => {
      const changes: Partial<DiscoverAppState> = {};
      if (!curr) {
        return changes;
      }

      if (prev?.query !== curr.query) {
        changes.query = curr.query;
      }

      return changes;
    }),
    filter((changes) => Object.keys(changes).length > 0)
  );
};

const createDataStateObservable = (
  state$: BehaviorSubject<DataMainMsg>
): Observable<{ error?: Error }> => {
  return state$.pipe(
    startWith(undefined),
    pairwise(),
    map(([prev, curr]) => {
      const changes: { error?: Error } = {};

      if (!curr) {
        return changes;
      }

      if (prev?.error !== curr.error) {
        changes.error = curr.error;
      }

      return changes;
    }),
    filter((changes) => Object.keys(changes).length > 0)
  );
};
