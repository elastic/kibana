/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlyout } from '@elastic/eui';
import { DataViewEditorLazy } from './data_view_editor_lazy';
import { DataViewEditorContext, DataViewEditorProps } from '../types';
import { createKibanaReactContext } from '../shared_imports';
import './data_view_editor.scss';

export interface DataViewEditorPropsWithServices extends DataViewEditorProps {
  services: DataViewEditorContext;
}

export const DataViewEditor = ({
  onSave,
  onCancel = () => {},
  services,
  defaultTypeIsRollup = false,
  requireTimestampField = false,
}: DataViewEditorPropsWithServices) => {
  const { Provider: KibanaReactContextProvider } =
    createKibanaReactContext<DataViewEditorContext>(services);

  return (
    <KibanaReactContextProvider>
      <EuiFlyout onClose={() => {}} hideCloseButton={true} size="l">
        <DataViewEditorLazy
          onSave={onSave}
          onCancel={onCancel}
          defaultTypeIsRollup={defaultTypeIsRollup}
          requireTimestampField={requireTimestampField}
        />
      </EuiFlyout>
    </KibanaReactContextProvider>
  );
};
