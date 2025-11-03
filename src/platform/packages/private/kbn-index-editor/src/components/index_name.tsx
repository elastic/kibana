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
import type { FC } from 'react';
import React, { useCallback } from 'react';
import useObservable from 'react-use/lib/useObservable';
import useMount from 'react-use/lib/useMount';
import type { KibanaContextExtra } from '../types';
import { INDEX_NAME_INVALID_CHARS, INDEX_NAME_INVALID_START_CHARS } from '../constants';

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
    setIndexName(indexNameValue).then(() => {
      setIsInitialized(true);
    });
  });

  const hasIndexNameCharsErrors = (value: string) => {
    if (INDEX_NAME_INVALID_START_CHARS.some((char) => value.startsWith(char))) {
      setError([
        i18n.translate('indexEditor.indexName.invalidStartCharError', {
          defaultMessage: 'The index name must not start with {chars}',
          values: { chars: INDEX_NAME_INVALID_START_CHARS.join(', ') },
        }),
      ]);
      return true;
    }

    if (INDEX_NAME_INVALID_CHARS.some((char) => value.includes(char))) {
      setError([
        i18n.translate('indexEditor.indexName.invalidCharsError', {
          defaultMessage: 'The index name must not contain spaces or {chars}',
          values: { chars: INDEX_NAME_INVALID_CHARS.filter((it) => it !== ' ').join(', ') },
        }),
      ]);
      return true;
    }

    return false;
  };

  const setIndexName = useCallback(
    async (value: string): Promise<boolean> => {
      setIsLoading(true);

      const hasCharErrors = hasIndexNameCharsErrors(value);
      if (hasCharErrors) {
        setIsLoading(false);
        return false;
      }

      const indexExists = await fileUpload.checkIndexExists(value);

      if (indexExists) {
        setIsLoading(false);
        setError([
          i18n.translate('indexEditor.indexName.alreadyExistsError', {
            defaultMessage: 'Index name already exists',
          }),
        ]);
        setIndexValidationStatus(STATUS.FAILED);
        return false;
      }

      if (!isIndexCreated) {
        indexUpdateService.setIndexName(value);
      }
      setIndexValidationStatus(STATUS.COMPLETED);
      setFileUploadIndexName(value);
      setError([]);
      setIsLoading(false);
      return true;
    },
    [
      fileUpload,
      setFileUploadIndexName,
      setIndexValidationStatus,
      indexUpdateService,
      isIndexCreated,
    ]
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
      css={{
        maxWidth: '75%',
      }}
      inputAriaLabel={i18n.translate('indexEditor.indexName.inputAriaLabel', {
        defaultMessage: 'Index name',
      })}
      placeholder={i18n.translate('indexEditor.indexName.placeholder', {
        defaultMessage: 'Set index name',
      })}
      defaultValue={indexNameValue ?? fileUploadIndexName}
      isReadOnly={isIndexCreated}
      isInvalid={error.length > 0}
      isLoading={isLoading}
      editModeProps={{
        formRowProps: { error },
        cancelButtonProps: { onClick: () => setError([]) },
        inputProps: {
          readOnly: isLoading,
          autoFocus: true,
          onChange: (e) => {
            setError([]);
            hasIndexNameCharsErrors(e.target.value);
          },
          'data-test-subj': 'indexNameInput',
        },
        saveButtonProps: {
          'data-test-subj': 'indexNameSaveButton',
        },
      }}
      readModeProps={{
        'data-test-subj': 'indexNameReadMode',
      }}
      onSave={async (value) => {
        return await setIndexName(value);
      }}
    />
  );
};
