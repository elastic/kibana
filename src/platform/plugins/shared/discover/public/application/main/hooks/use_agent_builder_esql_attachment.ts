/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import useUnmount from 'react-use/lib/useUnmount';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import { useAppStateSelector, useCurrentTabSelector } from '../state_management/redux';
import { useIsEsqlMode } from './use_is_esql_mode';

const discoverEsqlAttachmentId = (tabId: string) => `discover_esql_query_${tabId}`;

export const useAgentBuilderEsqlAttachment = () => {
  const { agentBuilder, chrome } = useDiscoverServices();
  const isEsqlMode = useIsEsqlMode();
  const query = useAppStateSelector((s) => s.query);
  const tabId = useCurrentTabSelector((t) => t.id);
  const tabLabel = useCurrentTabSelector((t) => t.label);

  const esqlQuery = isEsqlMode && isOfAggregateQueryType(query) ? query.esql.trim() : '';

  const [isAgentBuilderSidebarOpen, setIsAgentBuilderSidebarOpen] = useState(
    () => chrome.sidebar.getCurrentAppId() === 'agentBuilder'
  );

  useEffect(() => {
    const sub = chrome.sidebar.getCurrentAppId$().subscribe((appId) => {
      setIsAgentBuilderSidebarOpen(appId === 'agentBuilder');
    });
    return () => sub.unsubscribe();
  }, [chrome.sidebar]);

  useEffect(() => {
    if (!agentBuilder) {
      return;
    }

    const attachment =
      esqlQuery !== ''
        ? {
            id: discoverEsqlAttachmentId(tabId),
            type: AttachmentType.esql,
            data: {
              query: esqlQuery,
              ...(tabLabel ? { description: tabLabel } : {}),
            },
          }
        : undefined;

    if (isAgentBuilderSidebarOpen && attachment) {
      agentBuilder.addAttachment(attachment);
    } else {
      agentBuilder.setChatConfig({
        attachments: attachment ? [attachment] : [],
      });
    }
  }, [agentBuilder, esqlQuery, tabId, tabLabel, isAgentBuilderSidebarOpen]);

  useUnmount(() => {
    agentBuilder?.setChatConfig({
      attachments: [],
    });
  });
};
