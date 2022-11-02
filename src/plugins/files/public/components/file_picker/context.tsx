/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext, useMemo, useEffect } from 'react';
import type { FunctionComponent } from 'react';
import { useFilesContext, FilesContextValue } from '../context';
import { FilePickerState, createFilePickerState } from './file_picker_state';

interface FilePickerContextValue extends FilesContextValue {
  state: FilePickerState;
  kind: string;
}

const FilePickerCtx = createContext<FilePickerContextValue>(
  null as unknown as FilePickerContextValue
);

interface FilePickerContextProps {
  kind: string;
  pageSize: number;
  multiple: boolean;
}
export const FilePickerContext: FunctionComponent<FilePickerContextProps> = ({
  kind,
  pageSize,
  multiple,
  children,
}) => {
  const filesContext = useFilesContext();
  const { client } = filesContext;
  const state = useMemo(
    () => createFilePickerState({ pageSize, client, kind, uploadMultiple: multiple }),
    [pageSize, client, kind, multiple]
  );
  useEffect(() => state.dispose, [state]);
  return (
    <FilePickerCtx.Provider value={{ state, kind, ...filesContext }}>
      {children}
    </FilePickerCtx.Provider>
  );
};

export const useFilePickerContext = (): FilePickerContextValue => {
  const ctx = useContext(FilePickerCtx);
  if (!ctx) throw new Error('FilePickerContext not found!');
  return ctx;
};
