/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EmbeddableError } from '../embeddables/i_embeddable';

interface Props {
  error?: EmbeddableError;
}

export function EmbeddableErrorLabel(props: Props) {
  if (!props.error) return null;
  const labelText =
    props.error.name === 'AbortError'
      ? i18n.translate('embeddableApi.panel.labelAborted', {
          defaultMessage: 'Aborted',
        })
      : i18n.translate('embeddableApi.panel.labelError', {
          defaultMessage: 'Error',
        });

  return (
    <div className="embPanel__labelWrapper">
      <div className="embPanel__label">
        <EuiToolTip data-test-subj="embeddableErrorMessage" content={props.error.message}>
          <EuiBadge data-test-subj="embeddableErrorLabel" color="danger">
            {labelText}
          </EuiBadge>
        </EuiToolTip>
      </div>
    </div>
  );
}
