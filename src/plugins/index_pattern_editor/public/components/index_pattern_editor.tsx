/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlyout } from '@elastic/eui';
import { IndexPatternEditorLazy } from './index_pattern_editor_lazy';
import { IndexPatternEditorContext, IndexPatternEditorProps } from '../types';
import { createKibanaReactContext } from '../shared_imports';
import './index_pattern_editor.scss';

export interface IndexPatternEditorPropsWithServices extends IndexPatternEditorProps {
  services: IndexPatternEditorContext;
}

export const IndexPatternEditor = ({
  onSave,
  onCancel = () => {},
  services,
  defaultTypeIsRollup = false,
  requireTimestampField = false,
}: IndexPatternEditorPropsWithServices) => {
  const { Provider: KibanaReactContextProvider } =
    createKibanaReactContext<IndexPatternEditorContext>(services);

  return (
    <KibanaReactContextProvider>
      <EuiFlyout onClose={() => {}} hideCloseButton={true} size="l">
        <IndexPatternEditorLazy
          onSave={onSave}
          onCancel={onCancel}
          defaultTypeIsRollup={defaultTypeIsRollup}
          requireTimestampField={requireTimestampField}
        />
      </EuiFlyout>
    </KibanaReactContextProvider>
  );
};
