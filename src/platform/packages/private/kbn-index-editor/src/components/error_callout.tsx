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
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { KibanaContextExtra, IndexEditorErrors } from '../types';

const errorMessages: Record<IndexEditorErrors, string> = {
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
};

export const ErrorCallout = () => {
  const {
    services: { indexUpdateService },
  } = useKibana<KibanaContextExtra>();

  const error = useObservable(indexUpdateService.error$, null);

  return error ? (
    <EuiCallOut
      title={
        <FormattedMessage
          id="indexEditor.flyout.callout.title"
          defaultMessage="There was an error"
        />
      }
      iconType="error"
      color="danger"
    >
      {errorMessages[error]}
    </EuiCallOut>
  ) : null;
};
