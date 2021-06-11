/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlyout } from '@elastic/eui';
import { IndexPatternFlyoutContentContainer } from './index_pattern_flyout_content_container';
import { IndexPatternEditorContext } from '../types';
import { createKibanaReactContext, IndexPattern } from '../shared_imports';

export interface IndexPatternEditorProps {
  onSave: (indexPattern: IndexPattern) => void;
  closeEditor: () => void;
  services: IndexPatternEditorContext;
}

export const IndexPatternEditor = ({ onSave, closeEditor, services }: IndexPatternEditorProps) => {
  const {
    Provider: KibanaReactContextProvider,
  } = createKibanaReactContext<IndexPatternEditorContext>(services);

  return (
    <KibanaReactContextProvider>
      <EuiFlyout onClose={closeEditor} hideCloseButton={false}>
        <IndexPatternFlyoutContentContainer onSave={onSave} onCancel={closeEditor} />
      </EuiFlyout>
    </KibanaReactContextProvider>
  );
};
