/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import {
  useAppStateSelector,
  useCurrentTabRuntimeState,
  useCurrentTabSelector,
} from '../../state_management/redux';
import { buildScreenContext } from '../single_tab_view/discover_agent_builder_config';

export const DiscoverApplicationAttachmentButton = () => {
  const { agentBuilder } = useDiscoverServices();
  const dataView = useCurrentTabRuntimeState((tab) => tab.currentDataView$);
  const [columns, dataSource, query] = useAppStateSelector((state) => [
    state.columns,
    state.dataSource,
    state.query,
  ]);
  const timeRange = useCurrentTabSelector((tab) => tab.globalState.timeRange);

  const getAttachment = useCallback(() => {
    if (!dataView) {
      return null;
    }

    return buildScreenContext(
      dataView.getIndexPattern(),
      query,
      columns,
      dataSource?.type,
      timeRange
    );
  }, [columns, dataSource?.type, dataView, query, timeRange]);

  if (!agentBuilder?.ApplicationAttachmentButton || !dataView) {
    return null;
  }

  const ApplicationAttachmentButton = agentBuilder.ApplicationAttachmentButton;

  return (
    <ApplicationAttachmentButton
      getAttachment={getAttachment}
      iconType="documents"
      displayVariant="appHeader"
    />
  );
};
