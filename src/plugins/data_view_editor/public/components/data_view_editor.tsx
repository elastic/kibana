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
import { IndexPatternEditorContext, DataViewEditorProps } from '../types';
import { createKibanaReactContext } from '../shared_imports';
import './index_pattern_editor.scss';

export interface DataViewEditorPropsWithServices extends DataViewEditorProps {
  services: IndexPatternEditorContext;
}

export const IndexPatternEditor = ({
  onSave,
  onCancel = () => {},
  services,
  defaultTypeIsRollup = false,
  requireTimestampField = false,
}: DataViewEditorPropsWithServices) => {
  const { Provider: KibanaReactContextProvider } =
    createKibanaReactContext<IndexPatternEditorContext>(services);

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
