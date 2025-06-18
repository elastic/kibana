/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiInlineEditTitle } from '@elastic/eui';
import { STATUS, useFileUploadContext } from '@kbn/file-upload';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { FC } from 'react';
import { KibanaContextExtra } from '../types';

export const IndexName: FC = () => {
  const {
    services: { fileUpload },
  } = useKibana<KibanaContextExtra>();
  const { indexName, setIndexName, setIndexValidationStatus } = useFileUploadContext();

  const [error, setError] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  return (
    <EuiInlineEditTitle
      heading="h3"
      size={'m'}
      inputAriaLabel={i18n.translate('indexEditor.indexName.inputAriaLabel', {
        defaultMessage: 'Index name',
      })}
      placeholder={i18n.translate('indexEditor.indexName.placeholder', {
        defaultMessage: 'Set index name',
      })}
      defaultValue={indexName}
      isReadOnly={false}
      isInvalid={error !== null}
      editModeProps={{
        formRowProps: { error },
        cancelButtonProps: { onClick: () => setError([]) },
        inputProps: { readOnly: isLoading },
      }}
      onSave={async (value) => {
        setIsLoading(true);
        const indexExists = await fileUpload.checkIndexExists(value);
        setIsLoading(false);
        if (!indexExists) {
          setIndexValidationStatus(STATUS.COMPLETED);
          setIndexName(value);
          setError([]);
          return true;
        }
        setError([
          i18n.translate('indexEditor.indexName.alreadyExistsError', {
            defaultMessage: 'Index name already exists',
          }),
        ]);
        setIndexValidationStatus(STATUS.FAILED);
        return false;
      }}
    />
  );
};
