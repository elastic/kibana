/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import type { FunctionComponent } from 'react';
import { useBehaviorSubject } from '@kbn/shared-ux-file-util';
import { EuiConfirmModal } from '@elastic/eui';
import useMountedState from 'react-use/lib/useMountedState';
import { useFilePickerContext } from '../../context';
import { i18nTexts } from '../../i18n_texts';

export const DeletePrompt: FunctionComponent = () => {
  const [deleting, setDeleting] = React.useState(false);
  const isMounted = useMountedState();
  const { state } = useFilePickerContext();
  const file = useBehaviorSubject(state.deletePrompt$);

  if (!file) return null;

  const onConfirm = () => {
    setDeleting(true);
    state.delete(file).finally(() => {
      state.hideDeletePrompt();
      state.retry();
      if (isMounted()) {
        setDeleting(false);
      }
    });
  };

  return (
    <EuiConfirmModal
      buttonColor="danger"
      defaultFocusedButton="confirm"
      isLoading={deleting}
      title={i18nTexts.deleteFile}
      confirmButtonText={i18nTexts.delete}
      cancelButtonText={i18nTexts.cancel}
      onCancel={state.hideDeletePrompt}
      onConfirm={onConfirm}
    >
      <p>{i18nTexts.deleteFileQuestion(file.name)}</p>
    </EuiConfirmModal>
  );
};
