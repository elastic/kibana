/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import type { FunctionComponent } from 'react';
import { useEuiTheme, EuiEmptyPrompt, EuiConfirmModal } from '@elastic/eui';
import { css } from '@emotion/react';
import useObservable from 'react-use/lib/useObservable';

import { isEmpty } from 'lodash';
import { i18nTexts } from '../i18n_texts';
import { useFilePickerContext } from '../context';
import { FileCard, FileToBeDestroyed } from './file_card';

export const FileGrid: FunctionComponent = () => {
  const { client, state } = useFilePickerContext();
  const { euiTheme } = useEuiTheme();
  const files = useObservable(state.files$, []);

  const [fileToBeDestroyed, setFileToBeDestroyed] = useState<FileToBeDestroyed | undefined>();

  if (!files.length) {
    return <EuiEmptyPrompt title={<h3>{i18nTexts.emptyFileGridPrompt}</h3>} titleSize="s" />;
  }

  const onClickDelete = async () => {
    if (fileToBeDestroyed?.id && fileToBeDestroyed?.kind) {
      await client.delete({ id: fileToBeDestroyed.id, kind: fileToBeDestroyed.kind });
      state.resetFilters();
      closeDestroyModal();
    }
  };
  const closeDestroyModal = () => setFileToBeDestroyed(undefined);
  const showDestroyModal = (file: FileToBeDestroyed) => setFileToBeDestroyed(file);

  const destroyModal = () => {
    if (!isEmpty(fileToBeDestroyed)) {
      return (
        <EuiConfirmModal
          title="Delete File"
          onCancel={closeDestroyModal}
          onConfirm={() => onClickDelete()}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <p>{`You are about to delete file ${fileToBeDestroyed!.name}`}</p>
          <p>Are you sure you want to do this?</p>
        </EuiConfirmModal>
      );
    }
  };

  return (
    <div
      data-test-subj="fileGrid"
      css={css`
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(calc(${euiTheme.size.xxxxl} * 3), 1fr));
        gap: ${euiTheme.size.m};
      `}
    >
      {files.map((file, idx) => (
        <FileCard key={idx} file={file} onClickDelete={showDestroyModal} />
      ))}
      {destroyModal()}
    </div>
  );
};
