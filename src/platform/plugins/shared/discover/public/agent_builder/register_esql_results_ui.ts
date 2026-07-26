/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { ESQL_QUERY_RESULTS_ATTACHMENT_TYPE } from '../../common/agent_builder';

const MAX_QUERY_LABEL_LENGTH = 60;

/**
 * Registers the browser-side UI definition for the custom `esql.query_results` attachment type.
 * This controls how the attachment pill appears in the agent-builder chat:
 * - Label shows the truncated ES|QL query (e.g. "ES|QL results: from kibana_sample_data_logs")
 * - Icon uses the data table icon (visTable)
 *
 */
export const registerEsqlResultsAttachmentUi = (agentBuilder: AgentBuilderPluginStart) => {
  agentBuilder.attachments.addAttachmentType(ESQL_QUERY_RESULTS_ATTACHMENT_TYPE, {
    getLabel: (attachment: Attachment) => {
      const query = (attachment.data as { query?: string })?.query;
      if (query) {
        const truncated =
          query.length > MAX_QUERY_LABEL_LENGTH
            ? query.substring(0, MAX_QUERY_LABEL_LENGTH) + '...'
            : query;
        return i18n.translate('discover.agentBuilder.esqlResultsAttachmentLabel', {
          defaultMessage: 'ES|QL results: {query}',
          values: { query: truncated },
        });
      }
      return i18n.translate('discover.agentBuilder.esqlResultsAttachmentLabelDefault', {
        defaultMessage: 'ES|QL query results',
      });
    },
    getIcon: () => 'visTable',
  });
};
