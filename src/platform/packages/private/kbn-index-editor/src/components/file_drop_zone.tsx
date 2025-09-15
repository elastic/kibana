/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiProgress,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { STATUS, useFileUploadContext } from '@kbn/file-upload';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PropsWithChildren } from 'react';
import React, { type FC, useCallback, useEffect } from 'react';
import type { FileRejection } from 'react-dropzone';
import { useDropzone } from 'react-dropzone';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { getOverrideConfirmation } from './modals/override_warning_modal';
import { EmptyPrompt } from './empty_prompt';
import { FilesPreview } from './file_preview';
import type { KibanaContextExtra } from '../types';
import { IndexEditorErrors } from '../types';

const acceptedFileFormats = ['.csv'];

export interface FileSelectorContextType {
  onFileSelectorClick: () => void;
}

export const FileSelectorContext = React.createContext<FileSelectorContextType>({
  onFileSelectorClick: () => null,
});

export const useFileSelectorContext = (): FileSelectorContextType => {
  const context = React.useContext(FileSelectorContext);
  if (!context) {
    throw new Error('useFileSelectorContext must be used within a FileSelectorProvider');
  }
  return context;
};

export const FileDropzone: FC<PropsWithChildren<{ noResults: boolean }>> = ({
  children,
  noResults,
}) => {
  const { services } = useKibana<KibanaContextExtra>();
  const { indexUpdateService } = services;
  const { fileUploadManager, filesStatus, uploadStatus, indexName } = useFileUploadContext();
  const isSaving = useObservable(indexUpdateService.isSaving$, false);

  const isAnalyzing =
    uploadStatus.analysisStatus === STATUS.STARTED &&
    uploadStatus.overallImportStatus === STATUS.NOT_STARTED;

  const isUploading =
    uploadStatus.overallImportStatus === STATUS.STARTED ||
    (uploadStatus.overallImportStatus === STATUS.COMPLETED && isSaving);
  const overallImportProgress = uploadStatus.overallImportProgress;

  useEffect(
    function checkForErrors() {
      const removeFilesByName = (fileNames: string[]) => {
        fileUploadManager
          .getFiles()
          .map((f, i) => ({ fileName: f.getFileName(), index: i }))
          .filter((f) => fileNames.includes(f.fileName))
          .forEach((f) => {
            fileUploadManager.removeFile(f.index);
          });
      };

      // File size errors
      const filesTooBig = filesStatus.filter((f) => f.fileTooLarge);
      if (filesTooBig.length > 0) {
        const errorDetail = i18n.translate('indexEditor.filePicker.sizeError', {
          defaultMessage:
            'The following files exceed the maximum allowed size of {maxSize}: \n {files}',
          values: {
            maxSize: filesTooBig[0].fileSizeInfo.maxFileSizeFormatted,
            files: filesTooBig
              .map((file) => `- ${file.fileName} (${file.fileSizeInfo.fileSizeFormatted})`)
              .join('\n'),
          },
        });
        indexUpdateService.setError(IndexEditorErrors.FILE_TOO_BIG_ERROR, errorDetail);
        const filesToRemove = filesTooBig.map((f) => f.fileName);
        removeFilesByName(filesToRemove);
      }

      // Analysis errors
      const analysisErrors = filesStatus.filter((f) => f.analysisStatus === STATUS.FAILED);
      if (analysisErrors.length > 0) {
        const errorDetail = analysisErrors
          .map((file) => `- ${file.fileName}: ${file.analysisError.body.message}`)
          .join('\n');

        indexUpdateService.setError(IndexEditorErrors.FILE_ANALYSIS_ERROR, errorDetail);
        const filesToRemove = analysisErrors.map((f) => f.fileName);
        removeFilesByName(filesToRemove);
      }
    },
    [fileUploadManager, filesStatus, indexUpdateService]
  );

  useEffect(() => {
    // Generic errors
    if (uploadStatus.errors.length) {
      const errorDetail = uploadStatus.errors
        .map((errorItem) => `- ${errorItem.title}: \n ${errorItem?.error?.error?.reason}`)
        .join('\n');
      indexUpdateService.setError(IndexEditorErrors.FILE_UPLOAD_ERROR, errorDetail);
      indexUpdateService.setIsSaving(false);
    }
  }, [indexUpdateService, uploadStatus.errors]);

  const onFilesSelected = useCallback(
    async (files: File[]) => {
      if (!files?.length) {
        return;
      }

      const overrideConfirmation = await getOverrideConfirmation(services);
      if (!overrideConfirmation) {
        return;
      }

      indexUpdateService.discardUnsavedChanges();

      await fileUploadManager.addFiles(files);
    },
    [services, indexUpdateService, fileUploadManager]
  );

  const onDropRejected = useCallback(
    (fileRejections: FileRejection[]) => {
      const errorDetail = fileRejections
        .map(
          (rejection) =>
            `${rejection.file.name}: ${rejection.errors.map((e) => e.message).join(', ')}`
        )
        .join('\n');
      indexUpdateService.setError(IndexEditorErrors.FILE_REJECTION_ERROR, errorDetail);
    },
    [indexUpdateService]
  );

  const { getRootProps, getInputProps, isDragActive, inputRef } = useDropzone({
    onDropRejected,
    onDrop: onFilesSelected,
    accept: acceptedFileFormats,
    multiple: true,
    noClick: true, // we'll trigger open manually
    noKeyboard: true,
  });

  const onFileSelectorClick = useCallback(() => {
    // Clear the input value to allow re-selecting the same file
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    inputRef.current?.click();
  }, [inputRef]);

  const { euiTheme } = useEuiTheme();

  const FRAME = euiTheme.size.s;

  const overlayBase = css({
    position: 'absolute',
    padding: FRAME,
    inset: FRAME,
    background: transparentize(euiTheme.colors.backgroundLightText, 0.75),
    zIndex: 1000,
    border: `${euiTheme.border.width.thin} dashed ${euiTheme.colors.primary}`,
    borderRadius: euiTheme.border.radius.small,
  });

  const overlayDraggingFile = css([
    overlayBase,
    {
      cursor: 'grabbing',
    },
  ]);

  const loadingIndicator = (
    <div css={[overlayBase, { cursor: 'progress' }]}>
      {overallImportProgress ? (
        <EuiProgress
          value={overallImportProgress}
          max={100}
          size="s"
          color="primary"
          position="absolute"
        />
      ) : null}
      <div
        css={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          translate: '-50% -50%',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <EuiLoadingSpinner size="xl" />
        <div>
          {isAnalyzing ? (
            <FormattedMessage
              id="indexEditor.fileUpload.analyzingIndicator"
              defaultMessage={'Analyzing...'}
            />
          ) : null}
          {isUploading ? (
            <FormattedMessage
              id="indexEditor.fileUpload.uploadingIndicator"
              defaultMessage={'Uploading...'}
            />
          ) : null}
        </div>
      </div>
    </div>
  );

  const successfulPreviews = filesStatus.filter(
    (f) => f.analysisStatus === STATUS.COMPLETED && f.importStatus !== STATUS.COMPLETED
  );
  const showFilePreview = !isDragActive && successfulPreviews.length > 0;

  let content: React.ReactNode = children;

  if (noResults && !showFilePreview && !isSaving) {
    content = (
      <EuiFlexGroup direction="column" gutterSize="s" css={{ height: '100%' }}>
        <EuiFlexItem grow={false}>{content}</EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EmptyPrompt />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  } else if (showFilePreview) {
    content = <FilesPreview />;
  }

  const showLoadingOverlay = isUploading || isAnalyzing;

  if (indexName) {
    return (
      <FileSelectorContext.Provider value={{ onFileSelectorClick }}>
        {indexUpdateService.canEditIndex ? (
          <div {...getRootProps({ css: { height: '100%', cursor: 'default' } })}>
            {isDragActive ? <div css={overlayDraggingFile} /> : null}
            {showLoadingOverlay ? loadingIndicator : null}
            <input {...getInputProps()} data-test-subj="indexEditorFileInput" />
            {content}
          </div>
        ) : (
          content
        )}
      </FileSelectorContext.Provider>
    );
  } else {
    return null;
  }
};
