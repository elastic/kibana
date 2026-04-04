/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef } from 'react';
import type { AggregateQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { DiscoverAppMenuItemType, DiscoverAppMenuPopoverItem } from '@kbn/discover-utils';
import { AppMenuActionId } from '@kbn/discover-utils';
import type { DiscoverInternalState } from '../../../state_management/redux';
import { selectTab } from '../../../state_management/redux/selectors';
import type { AppMenuDiscoverParams } from './types';
import type { DiscoverServices } from '../../../../../build_services';

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

  const { history, core, alertingVTwo } = services;
  const RuleFormFlyout = alertingVTwo!.DynamicRuleFormFlyout;

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

  return <RuleFormFlyout query={query} onClose={onClose} />;
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
  const createRuleItem: DiscoverAppMenuPopoverItem = {
    id: 'create-rule',
    order: 1,
    label: i18n.translate('discover.localMenu.createRuleTitle', {
      defaultMessage: 'Create v2 ES|QL rule',
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
      defaultMessage: 'Create v1 rules',
    }),
    testId: 'discoverLegacyRulesButton',
    items: [],
  };

  const items: DiscoverAppMenuPopoverItem[] = [createRuleItem, legacyRulesItem];

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
