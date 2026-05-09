/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import { useScopedServices } from '../../../../../../components/scoped_services_provider/scoped_services_provider';
import { useCurrentTabSelector } from '../../../../state_management/redux';
import { CascadeEventDataKeys, CascadeEventName } from './event_definition';

export const useCascadedDocumentsTelemetry = () => {
  const { scopedEBTManager } = useScopedServices();
  const tabId = useCurrentTabSelector((tab) => tab.id);

  const trackCascadeExpanded = useCallback(
    (nodeId: string) =>
      scopedEBTManager.trackCascadeEvent({
        [CascadeEventDataKeys.CASCADE_EVENT_NAME]: CascadeEventName.EXPANDED,
        [CascadeEventDataKeys.TAB_ID]: tabId,
        [CascadeEventDataKeys.NODE_ID]: nodeId,
      }),
    [scopedEBTManager, tabId]
  );

  const trackCascadeCollapsed = useCallback(
    (nodeId: string) =>
      scopedEBTManager.trackCascadeEvent({
        [CascadeEventDataKeys.CASCADE_EVENT_NAME]: CascadeEventName.COLLAPSED,
        [CascadeEventDataKeys.TAB_ID]: tabId,
        [CascadeEventDataKeys.NODE_ID]: nodeId,
      }),
    [scopedEBTManager, tabId]
  );

  const trackCascadeOptOut = useCallback(
    () =>
      scopedEBTManager.trackCascadeEvent({
        [CascadeEventDataKeys.CASCADE_EVENT_NAME]: CascadeEventName.OPT_OUT,
        [CascadeEventDataKeys.TAB_ID]: tabId,
      }),
    [scopedEBTManager, tabId]
  );

  const trackCascadeOpenInNewTab = useCallback(
    () =>
      scopedEBTManager.trackCascadeEvent({
        [CascadeEventDataKeys.CASCADE_EVENT_NAME]: CascadeEventName.OPEN_IN_NEW_TAB_CLICKED,
        [CascadeEventDataKeys.TAB_ID]: tabId,
      }),
    [scopedEBTManager, tabId]
  );

  return {
    trackCascadeExpanded,
    trackCascadeCollapsed,
    trackCascadeOptOut,
    trackCascadeOpenInNewTab,
  };
};
