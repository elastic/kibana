/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { AggregateQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { DiscoverAppMenuItemType, DiscoverAppMenuPopoverItem } from '@kbn/discover-utils';
import { AppMenuActionId } from '@kbn/discover-utils';
import { DynamicRuleFormFlyout } from '@kbn/alerting-v2-rule-form';
import { ES_QUERY_ID } from '@kbn/rule-data-utils';
import type { DiscoverStateContainer } from '../../../state_management/discover_state';
import type { AppMenuDiscoverParams } from './types';
import type { DiscoverServices } from '../../../../../build_services';
import { CreateAlertFlyout, getManageRulesUrl, getTimeField } from './get_alerts';

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

  // Use a ref to avoid stale closure issues with onClose
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Track the initial pathname to detect actual navigation (not just query param changes)
  const initialPathnameRef = useRef(history.location.pathname);

  // Create the app state observable once and memoize it
  const appState$ = useMemo(() => stateContainer.createAppStateObservable(), [stateContainer]);

  useEffect(() => {
    const querySubscription = appState$.subscribe((appState) => {
      const esqlQuery = (appState.query as AggregateQuery)?.esql;
      if (esqlQuery !== undefined) {
        setQuery(esqlQuery || '');
      }
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
      unlisten();
    };
  }, [appState$, history]);

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
  const { dataView, isEsqlMode } = discoverParams;
  const timeField = getTimeField(dataView);
  const hasTimeFieldName = !isEsqlMode ? Boolean(dataView?.timeFieldName) : Boolean(timeField);

  const legacyItems: DiscoverAppMenuPopoverItem[] = [];

  if (services.capabilities.management?.insightsAndAlerting?.triggersActions) {
    if (discoverParams.authorizedRuleTypeIds.includes(ES_QUERY_ID)) {
      legacyItems.push({
        id: 'legacy-search-threshold',
        order: 1,
        label: i18n.translate('discover.localMenu.legacySearchThresholdTitle', {
          defaultMessage: 'Search threshold rule',
        }),
        iconType: 'bell',
        testId: 'discoverLegacySearchThresholdButton',
        disableButton: !hasTimeFieldName,
        tooltipContent: hasTimeFieldName
          ? undefined
          : i18n.translate('discover.localMenu.legacyMissedTimeFieldToolTip', {
              defaultMessage: 'Data view does not have a time field.',
            }),
        run: ({ context: { onFinishAction } }) => {
          return (
            <CreateAlertFlyout
              onFinishAction={onFinishAction}
              discoverParams={discoverParams}
              services={services}
              stateContainer={stateContainer}
            />
          );
        },
      });
    }

    legacyItems.push({
      id: 'manage-rules-connectors',
      order: Number.MAX_SAFE_INTEGER,
      label: i18n.translate('discover.localMenu.manageRulesAndConnectors', {
        defaultMessage: 'Manage rules and connectors',
      }),
      iconType: 'tableOfContents',
      testId: 'discoverManageRulesButton',
      href: getManageRulesUrl(services),
    });
  }

  const createRuleItem: DiscoverAppMenuPopoverItem = {
    id: 'create-rule',
    order: 1,
    label: i18n.translate('discover.localMenu.createRuleTitle', {
      defaultMessage: 'Create rule',
    }),
    iconType: 'bell',
    testId: 'discoverCreateRuleButton',
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

  const legacyRulesItem: DiscoverAppMenuPopoverItem = {
    id: 'legacy-rules',
    order: 2,
    label: i18n.translate('discover.localMenu.legacyRulesTitle', {
      defaultMessage: 'Create legacy rules',
    }),
    testId: 'discoverLegacyRulesButton',
    items: legacyItems,
  };

  const items: DiscoverAppMenuPopoverItem[] = [createRuleItem];

  if (legacyItems.length > 0) {
    items.push(legacyRulesItem);
  }

  return {
    id: AppMenuActionId.createRule,
    order: 3,
    label: i18n.translate('discover.localMenu.ruleTitle', {
      defaultMessage: 'Rules',
    }),
    iconType: 'bell',
    testId: 'discoverRulesMenuButton',
    tooltipContent: i18n.translate('discover.localMenu.ruleDescription', {
      defaultMessage: 'Create alerting rules from this query',
    }),
    items,
    popoverTestId: 'discoverRulesPopover',
  };
};
