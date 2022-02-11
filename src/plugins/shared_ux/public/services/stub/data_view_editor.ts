/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { FakeDataViewEditor } from './fake_data_view_editor';
import { DataViewEditorProps, DataViewEditorStart } from '../../../../data_view_editor/public';

const createStartContract = (): DataViewEditorStart => {
  return {
    IndexPatternEditorComponent: FakeDataViewEditor,
    openEditor: (options: DataViewEditorProps) => () => {},
    userPermissions: {
      editDataView: () => {
        return true;
      },
    },
  };
};

export const dataViewEditorPluginMock = {
  createStartContract,
};

export const dataViewEditorFactory = () => {
  return dataViewEditorPluginMock.createStartContract();
};
