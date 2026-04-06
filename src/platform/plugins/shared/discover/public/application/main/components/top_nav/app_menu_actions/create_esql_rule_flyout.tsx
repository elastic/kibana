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
