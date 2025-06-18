/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFilePicker, type EuiFilePickerProps } from '@elastic/eui';
import React, { useCallback, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiFilePickerClass } from '@elastic/eui/src/components/form/file_picker/file_picker';

export const FilePicker = () => {
  const filePickerRef = useRef<EuiFilePickerClass>(null);

  const onFilePickerChange = useCallback(
    async (files: FileList | null) => {
      if (files && files.length > 0) {
        // await fileUploadManager.addFiles(files);
        // Clear the file picker after adding files
        filePickerRef.current?.removeFiles();
      }
    },
    []
    // [fileUploadManager]
  );

  return (
    <EuiFilePicker
      ref={filePickerRef as React.Ref<Omit<EuiFilePickerProps, 'stylesMemoizer'>>}
      id={'csvFilePicker'}
      multiple
      compressed
      initialPromptText={i18n.translate('indexEditor.filePicker.initialPromptText', {
        defaultMessage: 'Upload CSV',
      })}
      onChange={(files) => onFilePickerChange(files)}
      display="default"
      aria-label="Use aria labels when no actual label is in use"
    />
  );
};
