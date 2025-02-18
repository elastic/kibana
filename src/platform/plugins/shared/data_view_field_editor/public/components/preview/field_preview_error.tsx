/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStateSelector } from '../../state_utils';
import { PreviewState } from './types';

import { useFieldPreviewContext } from './field_preview_context';

const fetchDocErrorSelector = (state: PreviewState) => state.fetchDocError;

export const FieldPreviewError = () => {
  const { controller } = useFieldPreviewContext();

  const fetchDocError = useStateSelector(controller.state$, fetchDocErrorSelector);

  if (fetchDocError === null) {
    return null;
  }

  return (
    <EuiCallOut
      title={i18n.translate('indexPatternFieldEditor.fieldPreview.errorCallout.title', {
        defaultMessage: 'Error fetching document',
      })}
      color="danger"
      iconType="error"
      role="alert"
      data-test-subj="fetchDocError"
    >
      <p data-test-subj="title">{fetchDocError.error.message ?? fetchDocError.error.reason}</p>
    </EuiCallOut>
  );
};
