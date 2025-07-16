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
import { EuiFlexItem, EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import { prettifyQuery } from '@kbn/esql-utils';

export function QueryWrapComponent({
  code,
  updateQuery,
}: {
  code: string;
  updateQuery: (qs: string) => void;
}) {
  return (
    <EuiFlexItem grow={false}>
      <EuiToolTip
        position="top"
        content={i18n.translate('esqlEditor.query.prettifyQueryLabel', {
          defaultMessage: 'Prettify query',
        })}
      >
        <EuiButtonIcon
          iconType={'pipeBreaks'}
          color="text"
          size="xs"
          data-test-subj="ESQLEditor-toggleWordWrap"
          aria-label={i18n.translate('esqlEditor.query.prettifyQueryLabel', {
            defaultMessage: 'Prettify query',
          })}
          onClick={() => {
            const updatedCode = prettifyQuery(code);
            if (code !== updatedCode) {
              updateQuery(updatedCode);
            }
          }}
        />
      </EuiToolTip>
    </EuiFlexItem>
  );
}
