/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState, useRef } from 'react';
import type { AggregateQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { DiscoverAppMenuItemType } from '@kbn/discover-utils';
import { AppMenuActionId } from '@kbn/discover-utils';
import { DynamicRuleFormFlyout } from '@kbn/alerting-v2-rule-form';
import type { DiscoverStateContainer } from '../../../state_management/discover_state';
import type { AppMenuDiscoverParams } from './types';
import type { DiscoverServices } from '../../../../../build_services';

export function CreateESQLRuleFlyout({
  services,
  stateContainer,
  onClose,
}: {
  discoverParams: AppMenuDiscoverParams;
  services: DiscoverServices;
  stateContainer: DiscoverStateContainer;
  onClose: () => void;
}) {
  const [query, setQuery] = useState<string>(
    (stateContainer.getCurrentTab().appState.query as AggregateQuery)?.esql || ''
  );

  const { http, data, dataViews, notifications, history } = services;
  const [queryError, setQueryError] = useState<Error | undefined>(undefined);

  // Use a ref to avoid stale closure issues with onClose
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const querySubscription = stateContainer.createAppStateObservable().subscribe((appState) => {
      const esqlQuery = (appState.query as AggregateQuery)?.esql;
      if (esqlQuery !== undefined) {
        setQuery(esqlQuery || '');
      }
    });
    const queryErrorSubscription = stateContainer.dataState.data$.main$.subscribe((dataState) => {
      if (dataState.error !== queryError) {
        setQueryError(dataState.error);
      }
    });

    // Listen for route changes to close the flyout
    // Only close on actual pathname changes, not query parameter updates (e.g., when user edits query)
    const initialPathname = history.location.pathname;
    const unlisten = history.listen((location) => {
      if (location.pathname !== initialPathname) {
        onCloseRef.current();
      }
    });

    return () => {
      querySubscription.unsubscribe();
      queryErrorSubscription.unsubscribe();
      unlisten();
    };
  }, [stateContainer, history, queryError]);

  return (
    <DynamicRuleFormFlyout
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
