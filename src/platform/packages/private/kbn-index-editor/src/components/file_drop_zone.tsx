/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiLoadingSpinner, EuiProgress, transparentize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { STATUS, useFileUploadContext } from '@kbn/file-upload';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { PropsWithChildren, useCallback, type FC, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { OverrideWarningModal } from './modals/override_warning_modal';
import { EmptyPrompt } from './empty_prompt';
import { FilesPreview } from './file_preview';
import { KibanaContextExtra } from '../types';

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
  const {
    services: { indexUpdateService },
  } = useKibana<KibanaContextExtra>();
  const [showOverrideWarning, setShowOverrideWarning] = useState(false);
  const { fileUploadManager, filesStatus, uploadStatus } = useFileUploadContext();

  const docsPendingToBeSaved = useObservable(indexUpdateService.savingDocs$, new Map());
  const columnsPendingToBeSaved = useObservable(indexUpdateService.pendingColumnsToBeSaved$, []);

  const isAnalyzing =
    uploadStatus.analysisStatus === STATUS.STARTED &&
    uploadStatus.overallImportStatus === STATUS.NOT_STARTED;

  const isUploading = uploadStatus.overallImportStatus === STATUS.STARTED;
  const overallImportProgress = uploadStatus.overallImportProgress;

  const onFilesSelected = useCallback(
    async (files: File[]) => {
      if (!files?.length) {
        return;
      }

      if (docsPendingToBeSaved.size > 0 || columnsPendingToBeSaved.length > 0) {
        setShowOverrideWarning(true);
        return;
      }

      await fileUploadManager.addFiles(files);
    },
    [fileUploadManager, docsPendingToBeSaved, columnsPendingToBeSaved]
  );

  const { getRootProps, getInputProps, isDragActive, inputRef, acceptedFiles } = useDropzone({
    onDrop: onFilesSelected,
    accept: acceptedFileFormats,
    multiple: true,
    noClick: true, // we'll trigger open manually
    noKeyboard: true,
  });

  const overrideDataAndLoadFiles = useCallback(async () => {
    setShowOverrideWarning(false);

    indexUpdateService.discardUnsavedChanges();
    indexUpdateService.discardUnsavedColumns();

    await fileUploadManager.addFiles(acceptedFiles);
  }, [acceptedFiles, fileUploadManager, indexUpdateService]);

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

  const showFilePreview =
    !isDragActive &&
    filesStatus.length > 0 &&
    uploadStatus.overallImportStatus !== STATUS.COMPLETED;

  let content: React.ReactNode = children;

  if (noResults && !showFilePreview) {
    content = (
      <>
        {content}
        <EmptyPrompt />
      </>
    );
  } else if (showFilePreview) {
    content = <FilesPreview />;
  }

  const showLoadingOverlay = isUploading || isAnalyzing;

  return (
    <FileSelectorContext.Provider value={{ onFileSelectorClick }}>
      <div {...getRootProps()}>
        {isDragActive ? <div css={overlayDraggingFile} /> : null}
        {showLoadingOverlay ? loadingIndicator : null}
        <input {...getInputProps()} />
        {content}
        {showOverrideWarning ? (
          <OverrideWarningModal
            onCancel={() => setShowOverrideWarning(false)}
            onContinue={overrideDataAndLoadFiles}
          />
        ) : null}
      </div>
    </FileSelectorContext.Provider>
  );
};
