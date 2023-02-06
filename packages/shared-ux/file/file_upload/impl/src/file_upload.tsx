/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFilePicker } from '@elastic/eui';
import React, { type FunctionComponent, useRef, useEffect, useMemo } from 'react';

import type { FileJSON } from '@kbn/shared-ux-file-types';
import { useFilesContext } from '@kbn/shared-ux-file-context';

import { FileUpload as Component } from './file_upload.component';
import { createUploadState } from './upload_state';
import { context } from './context';

/**
 * An object representing an uploaded file
 */
interface UploadedFile<Meta = unknown> {
  /**
   * The ID that was generated for the uploaded file
   */
  id: string;
  /**
   * The kind of the file that was passed in to this component
   */
  kind: string;
  /**
   * Attributes of a file that represent a serialised version of the file.
   */
  fileJSON: FileJSON<Meta>;
}

/**
 * FileUpload component props
 */
export interface Props<Kind extends string = string> {
  /**
   * A file kind that should be registered during plugin startup. See {@link FileServiceStart}.
   */
  kind: Kind;
  /**
   * Allow users to clear a file after uploading.
   *
   * @note this will NOT delete an uploaded file.
   */
  allowClear?: boolean;
  /**
   * Start uploading the file as soon as it is provided
   * by the user.
   */
  immediate?: boolean;
  /**
   * Metadata that you want to associate with any uploaded files
   */
  meta?: Record<string, unknown>;
  /**
   * Whether to display the file picker with width 100%;
   */
  fullWidth?: boolean;
  /**
   * Whether this component should display a "done" state after processing an
   * upload or return to the initial state to allow for another upload.
   *
   * @default false
   */
  allowRepeatedUploads?: boolean;
  /**
   * The initial text prompt
   */
  initialPromptText?: string;
  /**
   * Called when the an upload process fully completes
   */
  onDone: (files: UploadedFile[]) => void;

  /**
   * Called when an error occurs during upload
   */
  onError?: (e: Error) => void;

  /**
   * Will be called whenever an upload starts
   */
  onUploadStart?: () => void;

  /**
   * Will be called when attempt ends, in error otherwise
   */
  onUploadEnd?: () => void;

  /**
   * Whether to display the component in it's compact form.
   *
   * @default false
   *
   * @note passing "true" here implies true for allowRepeatedUplods and immediate.
   */
  compressed?: boolean;

  /**
   * Allow upload more than one file at a time
   *
   * @default false
   */
  multiple?: boolean;
  /**
   * Class name that is passed to the container element
   */
  className?: string;
}

/**
 * This component is intended as a wrapper around EuiFilePicker with some opinions
 * about upload UX. It is optimised for use in modals, flyouts or forms.
 *
 * In order to use this component you must register your file kind with {@link FileKindsRegistry}
 */
export const FileUpload = <Kind extends string = string>({
  meta,
  onDone,
  onError,
  fullWidth,
  allowClear,
  onUploadEnd,
  onUploadStart,
  compressed = false,
  kind: kindId,
  multiple = false,
  initialPromptText,
  immediate = false,
  allowRepeatedUploads = false,
  className,
}: Props<Kind>): ReturnType<FunctionComponent> => {
  const { client } = useFilesContext();
  const ref = useRef<null | EuiFilePicker>(null);
  const fileKind = client.getFileKind(kindId);
  const repeatedUploads = compressed || allowRepeatedUploads;
  const uploadState = useMemo(
    () =>
      createUploadState({
        client,
        fileKind,
        allowRepeatedUploads: repeatedUploads,
      }),
    [client, repeatedUploads, fileKind]
  );

  /**
   * Hook state into component callbacks
   */
  useEffect(() => {
    const subs = [
      uploadState.clear$.subscribe(() => {
        ref.current?.removeFiles();
      }),
      uploadState.done$.subscribe((n) => n && onDone(n)),
      uploadState.error$.subscribe((e) => e && onError?.(e)),
      uploadState.uploading$.subscribe((uploading) =>
        uploading ? onUploadStart?.() : onUploadEnd?.()
      ),
    ];
    return () => subs.forEach((sub) => sub.unsubscribe());
  }, [uploadState, onDone, onError, onUploadStart, onUploadEnd]);

  useEffect(() => uploadState.dispose, [uploadState]);

  return (
    <context.Provider value={uploadState}>
      <Component
        compressed={compressed}
        ref={ref}
        accept={fileKind.allowedMimeTypes?.join(',')}
        meta={meta}
        immediate={compressed || immediate}
        allowClear={allowClear}
        fullWidth={fullWidth}
        initialFilePromptText={initialPromptText}
        multiple={multiple}
        className={className}
      />
    </context.Provider>
  );
};

/* eslint-disable import/no-default-export */
export default FileUpload;
