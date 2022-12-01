/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useBehaviorSubject } from '@kbn/shared-ux-file-util';
import { useUploadState } from '../context';
import { UploadButton } from './upload_button';
import { RetryButton } from './retry_button';
import { CancelButton } from './cancel_button';

interface Props {
  onCancel: () => void;
  onUpload: () => void;
  immediate?: boolean;
  compressed?: boolean;
}

export const ControlButton: FunctionComponent<Props> = ({
  onCancel,
  onUpload,
  immediate,
  compressed,
}) => {
  const uploadState = useUploadState();
  const uploading = useBehaviorSubject(uploadState.uploading$);
  const files = useObservable(uploadState.files$, []);
  const retry = Boolean(files.some((f) => f.status === 'upload_failed'));

  if (compressed || uploading) return <CancelButton compressed={compressed} onClick={onCancel} />;
  if (retry) return <RetryButton onClick={onUpload} />;
  if (!immediate) return <UploadButton onClick={onUpload} />;

  return null;
};
