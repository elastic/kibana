/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import { useAppStateSelector, useCurrentTabSelector } from '../state_management/redux';
import { useIsEsqlMode } from './use_is_esql_mode';

const DISCOVER_ACTIVE_ESQL_ATTACHMENT_ID = 'discover_active_esql_context';

export const useAgentBuilderEsqlAttachment = () => {
  const { agentBuilder } = useDiscoverServices();
  const isEsqlMode = useIsEsqlMode();
  const query = useAppStateSelector((s) => s.query);
  const tabLabel = useCurrentTabSelector((t) => t.label);

  const esqlQuery = isEsqlMode && isOfAggregateQueryType(query) ? query.esql.trim() : '';

  useEffect(() => {
    agentBuilder?.setChatConfig({
      attachments: esqlQuery
        ? [
            {
              id: DISCOVER_ACTIVE_ESQL_ATTACHMENT_ID,
              type: AttachmentType.esql,
              data: {
                query: esqlQuery,
                ...(tabLabel ? { description: tabLabel } : {}),
              },
            },
          ]
        : [],
    });
  }, [agentBuilder, esqlQuery, tabLabel]);

  useEffect(() => {
    return () => {
      agentBuilder?.clearChatConfig();
    };
  }, [agentBuilder]);
};
