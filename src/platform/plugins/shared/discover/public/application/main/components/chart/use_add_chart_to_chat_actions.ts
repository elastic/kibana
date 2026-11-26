/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type { UnifiedHistogramChartProps } from '@kbn/unified-histogram';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

// the agent builder visualization attachment, which renders a Lens API config inline in the chat
const VISUALIZATION_ATTACHMENT_TYPE = 'visualization';

const ADD_TO_CHAT_LABEL = i18n.translate('discover.chart.addToChatButton', {
  defaultMessage: 'Add to chat',
});

/** An "Add to chat" toolbar button for an ES|QL chart, attaching it as a visualization. */
export const useAddChartToChatActions = (): UnifiedHistogramChartProps['getAdditionalActions'] => {
  const { agentBuilder } = useDiscoverServices();

  return useCallback<NonNullable<UnifiedHistogramChartProps['getAdditionalActions']>>(
    ({ isEsql, attributes, relativeTimeRange }) => {
      const { query } = attributes.state;
      if (!agentBuilder || !isEsql || !isOfAggregateQueryType(query)) {
        return [];
      }
      const onClick = () => {
        const visualization = new LensConfigBuilder().toAPIFormat(attributes as LensAttributes);
        const attachment = {
          type: VISUALIZATION_ATTACHMENT_TYPE,
          data: {
            renderer: 'lens',
            query: attributes.title || query.esql,
            visualization,
            chart_type: visualization.type,
            esql: query.esql,
            time_range: { from: relativeTimeRange.from, to: relativeTimeRange.to },
          },
        };
        agentBuilder.openChat({ sessionTag: 'discover', attachments: [attachment] });
      };
      return [
        {
          label: ADD_TO_CHAT_LABEL,
          toolTipContent: ADD_TO_CHAT_LABEL,
          iconType: 'addToChat',
          'data-test-subj': 'discoverChartAddToChat',
          onClick,
        },
      ];
    },
    [agentBuilder]
  );
};
