/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';
import { useBehaviorSubject } from '@kbn/shared-ux-file-util';
import useObservable from 'react-use/lib/useObservable';
import { i18nTexts } from '../i18n_texts';
import { useUploadState } from '../context';

interface Props {
  onClick: () => void;
}

export const UploadButton: FunctionComponent<Props> = ({ onClick }) => {
  const uploadState = useUploadState();
  const uploading = useBehaviorSubject(uploadState.uploading$);
  const error = useBehaviorSubject(uploadState.error$);
  const done = useObservable(uploadState.done$);
  const files = useObservable(uploadState.files$, []);
  return (
    <EuiButton
      key="uploadButton"
      isLoading={uploading}
      color={done ? 'success' : 'primary'}
      iconType={done ? 'checkInCircleFilled' : undefined}
      disabled={Boolean(!files.length || error || done)}
      onClick={onClick}
      size="s"
      data-test-subj="uploadButton"
    >
      {done ? i18nTexts.uploadComplete : uploading ? i18nTexts.uploading : i18nTexts.upload}
    </EuiButton>
  );
};
