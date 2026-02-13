/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiFlexItem, EuiToolTip } from '@elastic/eui';

export function QueryWrapComponent({ onPrettifyQuery }: { onPrettifyQuery: () => void }) {
  return (
    <EuiFlexItem grow={false}>
      <EuiToolTip
        position="top"
        content={i18n.translate('esqlEditor.query.formatQueryLabel', {
          defaultMessage: 'Prettify query',
        })}
        disableScreenReaderOutput
      >
        <EuiButtonIcon
          iconType="pipeBreaks"
          color="text"
          size="xs"
          data-test-subj="ESQLEditor-toggleWordWrap"
          aria-label={i18n.translate('esqlEditor.query.formatQueryLabel', {
            defaultMessage: 'Prettify query',
          })}
          onClick={onPrettifyQuery}
        />
      </EuiToolTip>
    </EuiFlexItem>
  );
}
