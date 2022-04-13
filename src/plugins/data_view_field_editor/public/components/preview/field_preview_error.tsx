/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useFieldPreviewContext } from './field_preview_context';

export const FieldPreviewError = () => {
  const {
    documents: { fetchDocError },
  } = useFieldPreviewContext();

  if (fetchDocError === null) {
    return null;
  }

  return (
    <EuiCallOut
      title={i18n.translate('indexPatternFieldEditor.fieldPreview.errorCallout.title', {
        defaultMessage: 'Error fetching document',
      })}
      color="danger"
      iconType="alert"
      role="alert"
      data-test-subj="fetchDocError"
    >
      <p data-test-subj="title">{fetchDocError.error.message ?? fetchDocError.error.reason}</p>
    </EuiCallOut>
  );
};
