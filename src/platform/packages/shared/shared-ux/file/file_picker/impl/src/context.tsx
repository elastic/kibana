/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, useMemo, useEffect } from 'react';
import type { FC, PropsWithChildren } from 'react';
import type { FilesContextValue } from '@kbn/shared-ux-file-context';
import { useFilesContext } from '@kbn/shared-ux-file-context';
import type { FileJSON } from '@kbn/shared-ux-file-types';
import type { FilePickerState } from './file_picker_state';
import { createFilePickerState } from './file_picker_state';

interface FilePickerContextValue extends FilesContextValue {
  state: FilePickerState;
  kind: string;
  uploadMeta?: unknown;
  shouldAllowDelete?: (file: FileJSON) => boolean;
}

const FilePickerCtx = createContext<FilePickerContextValue>(
  null as unknown as FilePickerContextValue
);

interface FilePickerContextProps
  extends Pick<FilePickerContextValue, 'kind' | 'shouldAllowDelete'> {
  pageSize: number;
  multiple: boolean;
  uploadMeta?: unknown;
}

export const FilePickerContext: FC<PropsWithChildren<FilePickerContextProps>> = ({
  kind,
  shouldAllowDelete,
  pageSize,
  multiple,
  children,
  uploadMeta,
}) => {
  const filesContext = useFilesContext();
  const { client } = filesContext;
  const state = useMemo(
    () => createFilePickerState({ pageSize, client, kind, selectMultiple: multiple }),
    [pageSize, client, kind, multiple]
  );
  useEffect(() => state.dispose, [state]);
  return (
    <FilePickerCtx.Provider value={{ state, kind, shouldAllowDelete, uploadMeta, ...filesContext }}>
      {children}
    </FilePickerCtx.Provider>
  );
};

export const useFilePickerContext = (): FilePickerContextValue => {
  const ctx = useContext(FilePickerCtx);
  if (!ctx) throw new Error('FilePickerContext not found!');
  return ctx;
};
