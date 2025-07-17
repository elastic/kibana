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
import React, { FC, useCallback } from 'react';
import useObservable from 'react-use/lib/useObservable';
import useMount from 'react-use/lib/useMount';
import { KibanaContextExtra } from '../types';

export const IndexName: FC = () => {
  const {
    services: { fileUpload, indexUpdateService },
  } = useKibana<KibanaContextExtra>();

  const [isInitialized, setIsInitialized] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const indexNameValue = useObservable(
    indexUpdateService.indexName$,
    indexUpdateService.getIndexName()
  );

  const isIndexCreated = useObservable<boolean>(
    indexUpdateService.indexCreated$,
    indexUpdateService.isIndexCreated()
  );

  const {
    indexName: fileUploadIndexName,
    setIndexName: setFileUploadIndexName,
    setIndexValidationStatus,
  } = useFileUploadContext();

  useMount(function validateIndexNameOnMount() {
    if (isIndexCreated) {
      setIsInitialized(true);
      setIsLoading(false);
      setIndexValidationStatus(STATUS.COMPLETED);
      setFileUploadIndexName(indexNameValue!);
      return;
    }

    if (!indexNameValue) {
      setIsInitialized(true);
      setIsLoading(false);
      return;
    }
    validateIndexName(indexNameValue).then(() => {
      setIsInitialized(true);
    });
  });

  const validateIndexName = useCallback(
    async (value: string): Promise<boolean> => {
      setIsLoading(true);
      const indexExists = await fileUpload.checkIndexExists(value);
      setIsLoading(false);
      if (indexExists) {
        setIndexValidationStatus(STATUS.FAILED);
        setError([
          i18n.translate('indexEditor.indexName.alreadyExistsError', {
            defaultMessage: 'Index name already exists',
          }),
        ]);
        return false;
      }
      setIndexValidationStatus(STATUS.COMPLETED);
      setFileUploadIndexName(value);
      setError([]);
      return true;
    },
    [fileUpload, setFileUploadIndexName, setIndexValidationStatus]
  );

  if (!isInitialized) {
    return null; // or a loading spinner
  }

  const startWithEditOpen = error.length > 0 || !indexNameValue;

  return (
    <EuiInlineEditTitle
      startWithEditOpen={startWithEditOpen}
      heading="h3"
      size={'m'}
      inputAriaLabel={i18n.translate('indexEditor.indexName.inputAriaLabel', {
        defaultMessage: 'Index name',
      })}
      placeholder={i18n.translate('indexEditor.indexName.placeholder', {
        defaultMessage: 'Set index name',
      })}
      defaultValue={indexNameValue ?? fileUploadIndexName}
      isReadOnly={isIndexCreated}
      isInvalid={error !== null}
      isLoading={isLoading}
      editModeProps={{
        formRowProps: { error },
        cancelButtonProps: { onClick: () => setError([]) },
        inputProps: { readOnly: isLoading },
      }}
      readModeProps={{
        'data-test-subj': 'indexNameReadMode',
      }}
      onSave={async (value) => {
        setIsLoading(true);
        const indexExists = await fileUpload.checkIndexExists(value);
        setIsLoading(false);
        if (!indexExists) {
          setIndexValidationStatus(STATUS.COMPLETED);
          indexUpdateService.setIndexName(value);
          setFileUploadIndexName(value);
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
