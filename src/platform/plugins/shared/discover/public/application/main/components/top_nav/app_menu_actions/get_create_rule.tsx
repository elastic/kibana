/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, useEffect, useRef } from 'react';
import type { AggregateQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { DiscoverAppMenuItemType, DiscoverAppMenuPopoverItem } from '@kbn/discover-utils';
import { AppMenuActionId } from '@kbn/discover-utils';
import { ES_QUERY_ID } from '@kbn/rule-data-utils';
import type { DiscoverInternalState } from '../../../state_management/redux';
import { selectTab } from '../../../state_management/redux/selectors';
import type { AppMenuDiscoverParams } from './types';
import type { DiscoverServices } from '../../../../../build_services';
import { CreateAlertFlyout, getManageRulesUrl, getTimeField } from './get_alerts';

// Lazy load to avoid Jest module resolution issues with Monaco dependencies
const DynamicRuleFormFlyout = React.lazy(() =>
  import('@kbn/alerting-v2-rule-form').then((m) => ({ default: m.DynamicRuleFormFlyout }))
);

export function CreateESQLRuleFlyout({
  services,
  tabId,
  getState,
  onClose,
}: {
  discoverParams: AppMenuDiscoverParams;
  services: DiscoverServices;
  tabId: string;
  getState: () => DiscoverInternalState;
  onClose: () => void;
}) {
  const currentTab = selectTab(getState(), tabId);
  const query = (currentTab.appState.query as AggregateQuery)?.esql || '';

  const { http, data, dataViews, notifications, history, core } = services;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const initialPathnameRef = useRef(history.location.pathname);

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

  return (
    <Suspense fallback={<EuiLoadingSpinner size="l" />}>
      <DynamicRuleFormFlyout
        services={{
          http,
          data,
          dataViews,
          notifications,
          application: core.application,
        }}
        query={query}
        onClose={onClose}
      />
    </Suspense>
  );
}

export const getCreateRuleMenuItem = ({
  discoverParams,
  services,
  tabId,
  getState,
}: {
  discoverParams: AppMenuDiscoverParams;
  services: DiscoverServices;
  tabId: string;
  getState: () => DiscoverInternalState;
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
              tabId={tabId}
              getState={getState}
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
          tabId={tabId}
          getState={getState}
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
