/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FC } from 'react';
import { DataViewEditorProps, DataViewEditorStart } from '../../../../data_view_editor/public';

const dataViewEditor = (): DataViewEditorStart => {
  return {
    IndexPatternEditorComponent: {} as FC<DataViewEditorProps>,
    openEditor: (options: DataViewEditorProps) => () => {},
    userPermissions: {
      editDataView: () => {
        return true;
      },
    },
  };
};

export const dataViewEditorFactory = () => {
  return dataViewEditor();
};
