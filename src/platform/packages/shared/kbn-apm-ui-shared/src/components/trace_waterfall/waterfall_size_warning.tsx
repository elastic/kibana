/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCallOut, EuiLink } from '@elastic/eui';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { TRACE_WATERFALL_EBT_ELEMENTS } from './ebt_constants';

interface WaterfallSizeWarningProps {
  traceDocsTotal: number;
  maxTraceItems: number;
  discoverHref?: string;
  'data-test-subj'?: string;
  /** EBT click `element` supplied by the hosting waterfall so Discover-link clicks can be attributed to its surface. */
  ebtElement?: string;
}

export function WaterfallSizeWarning({
  traceDocsTotal,
  maxTraceItems,
  discoverHref,
  'data-test-subj': dataTestSubj = 'waterfallSizeWarning',
  ebtElement = TRACE_WATERFALL_EBT_ELEMENTS.WATERFALL_SIZE_WARNING_DISCOVER_LINK,
}: WaterfallSizeWarningProps) {
  return (
    <EuiCallOut
      announceOnMount
      data-test-subj={dataTestSubj}
      color="warning"
      size="s"
      iconType="warning"
      title={
        discoverHref ? (
          <FormattedMessage
            id="apmUiShared.waterfall.exceedsMax.withDiscoverLink"
            defaultMessage="The number of items in this trace is {traceDocsTotal} which is higher than the current limit of {maxTraceItems}. Please increase the limit via apmCommon.ui.maxTraceItems to see the full trace, or {discoverLink}."
            values={{
              traceDocsTotal,
              maxTraceItems,
              discoverLink: (
                <EuiLink
                  data-test-subj={`${dataTestSubj}DiscoverLink`}
                  href={discoverHref}
                  {...getEbtProps({
                    action: EBT_CLICK_ACTIONS.OPEN_IN_DISCOVER,
                    element: ebtElement,
                  })}
                >
                  <FormattedMessage
                    id="apmUiShared.waterfall.exceedsMax.discoverLinkText"
                    defaultMessage="view the full trace in Discover"
                  />
                </EuiLink>
              ),
            }}
          />
        ) : (
          <FormattedMessage
            id="apmUiShared.waterfall.exceedsMax"
            defaultMessage="The number of items in this trace is {traceDocsTotal} which is higher than the current limit of {maxTraceItems}. Please increase the limit via apmCommon.ui.maxTraceItems to see the full trace."
            values={{ traceDocsTotal, maxTraceItems }}
          />
        )
      }
    />
  );
}
