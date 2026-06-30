/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import type { ApplicationAttachmentLinkDescriptor } from '@kbn/agent-builder-browser';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import {
  useAppStateSelector,
  useCurrentTabRuntimeState,
  useCurrentTabSelector,
  useInternalStateSelector,
} from '../../state_management/redux';
import { getDiscoverSessionAttachmentId } from '../../../../../common/discover_session_attachment';
import { buildDiscoverSessionAttachment } from '../single_tab_view/discover_agent_builder_config';

export const DiscoverApplicationAttachmentButton = () => {
  const { agentBuilder } = useDiscoverServices();
  const dataView = useCurrentTabRuntimeState((tab) => tab.currentDataView$);
  const sessionId = useInternalStateSelector((state) => state.persistedDiscoverSession?.id);
  const sessionTitle = useInternalStateSelector((state) => state.persistedDiscoverSession?.title);
  const currentTabId = useInternalStateSelector((state) => state.tabs.unsafeCurrentId);
  const [columns, dataSource, query] = useAppStateSelector((state) => [
    state.columns,
    state.dataSource,
    state.query,
  ]);
  const timeRange = useCurrentTabSelector((tab) => tab.globalState.timeRange);

  const linkDescriptor = useMemo<ApplicationAttachmentLinkDescriptor>(
    () => ({
      attachmentId: getDiscoverSessionAttachmentId({
        sessionId,
        tabId: currentTabId,
      }),
      origin: sessionId ?? currentTabId,
    }),
    [currentTabId, sessionId]
  );

  const getAttachment = useCallback(() => {
    if (!dataView) {
      return null;
    }

    return buildDiscoverSessionAttachment({
      dataViewTitle: dataView.getIndexPattern(),
      dataViewId: dataView.id,
      query,
      columns,
      dataSourceType: dataSource?.type,
      timeRange,
      sessionId,
      sessionTitle,
      tabId: currentTabId,
    });
  }, [
    columns,
    currentTabId,
    dataSource?.type,
    dataView,
    query,
    sessionId,
    sessionTitle,
    timeRange,
  ]);

  if (!agentBuilder?.ApplicationAttachmentButton) {
    return null;
  }

  const ApplicationAttachmentButton = agentBuilder.ApplicationAttachmentButton;

  return (
    <ApplicationAttachmentButton
      getAttachment={getAttachment}
      linkDescriptor={linkDescriptor}
      iconType="documents"
      displayVariant="appHeader"
    />
  );
};
