/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import type { KibanaContextExtra } from '../types';
import { IndexEditorErrors } from '../types';

const errorTitles: Record<IndexEditorErrors, string> = {
  [IndexEditorErrors.GENERIC_SAVING_ERROR]: i18n.translate(
    'indexEditor.flyout.error.genericSavingError',
    {
      defaultMessage: 'There was an internal error saving the index in Elasticsearch.',
    }
  ),
  [IndexEditorErrors.PARTIAL_SAVING_ERROR]: i18n.translate(
    'indexEditor.flyout.error.partialSavingError',
    {
      defaultMessage: 'Some of the changes made to the index were not saved.',
    }
  ),
  [IndexEditorErrors.FILE_REJECTION_ERROR]: i18n.translate(
    'indexEditor.flyout.error.fileRejectionError',
    {
      defaultMessage: 'Some of the selected files were rejected.',
    }
  ),
  [IndexEditorErrors.FILE_TOO_BIG_ERROR]: i18n.translate(
    'indexEditor.flyout.error.fileTooBigError',
    {
      defaultMessage: 'Some of the selected files are too big to be imported.',
    }
  ),
  [IndexEditorErrors.FILE_UPLOAD_ERROR]: i18n.translate(
    'indexEditor.flyout.error.fileUploadError',
    {
      defaultMessage: 'An error occurred while uploading the files.',
    }
  ),
  [IndexEditorErrors.FILE_ANALYSIS_ERROR]: i18n.translate(
    'indexEditor.flyout.error.fileAnalysisError',
    {
      defaultMessage: 'An error occurred while analyzing the files.',
    }
  ),
};

export const ErrorCallout = () => {
  const {
    services: { indexUpdateService },
  } = useKibana<KibanaContextExtra>();

  const error = useObservable(indexUpdateService.error$, null);

  const onDismiss = useCallback(() => {
    indexUpdateService.setError(null);
  }, [indexUpdateService]);

  return error ? (
    <EuiCallOut
      title={errorTitles[error.id]}
      iconType="error"
      color="danger"
      onDismiss={onDismiss}
      css={{
        minBlockSize: 'unset',
      }}
    >
      <p css={{ whiteSpace: 'pre-line' }}>{error.details}</p>
    </EuiCallOut>
  ) : null;
};
