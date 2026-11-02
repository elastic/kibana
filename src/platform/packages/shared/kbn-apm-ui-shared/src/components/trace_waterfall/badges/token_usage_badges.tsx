/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { asInteger } from '../../../utils';

interface Props {
  inputTokens?: number;
  outputTokens?: number;
}

const INPUT_TOKENS_TOOLTIP = i18n.translate('apmUiShared.traceWaterfall.inputTokensBadgeTooltip', {
  defaultMessage: 'GenAI input tokens consumed',
});

const OUTPUT_TOKENS_TOOLTIP = i18n.translate(
  'apmUiShared.traceWaterfall.outputTokensBadgeTooltip',
  {
    defaultMessage: 'GenAI output tokens consumed',
  }
);

export function TokenUsageBadges({ inputTokens, outputTokens }: Props) {
  if (inputTokens == null && outputTokens == null) {
    return null;
  }

  return (
    <>
      {inputTokens != null ? (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={INPUT_TOKENS_TOOLTIP}>
            <EuiBadge color="hollow" tabIndex={0} data-test-subj="apmBarDetailsInputTokensBadge">
              {i18n.translate('apmUiShared.traceWaterfall.inputTokensBadge', {
                defaultMessage: 'input.tokens: {count}',
                values: { count: asInteger(inputTokens) },
              })}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      ) : null}
      {outputTokens != null ? (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={OUTPUT_TOKENS_TOOLTIP}>
            <EuiBadge color="hollow" tabIndex={0} data-test-subj="apmBarDetailsOutputTokensBadge">
              {i18n.translate('apmUiShared.traceWaterfall.outputTokensBadge', {
                defaultMessage: 'output.tokens: {count}',
                values: { count: asInteger(outputTokens) },
              })}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      ) : null}
    </>
  );
}
