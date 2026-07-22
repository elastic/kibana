/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  inputTokens?: number;
  outputTokens?: number;
}

export function TokenUsageBadges({ inputTokens, outputTokens }: Props) {
  if (inputTokens == null && outputTokens == null) {
    return null;
  }

  return (
    <>
      {inputTokens != null ? (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" data-test-subj="apmBarDetailsInputTokensBadge">
            {i18n.translate('apmUiShared.traceWaterfall.inputTokensBadge', {
              defaultMessage: 'input.tokens: {count}',
              values: { count: inputTokens },
            })}
          </EuiBadge>
        </EuiFlexItem>
      ) : null}
      {outputTokens != null ? (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" data-test-subj="apmBarDetailsOutputTokensBadge">
            {i18n.translate('apmUiShared.traceWaterfall.outputTokensBadge', {
              defaultMessage: 'output.tokens: {count}',
              values: { count: outputTokens },
            })}
          </EuiBadge>
        </EuiFlexItem>
      ) : null}
    </>
  );
}
