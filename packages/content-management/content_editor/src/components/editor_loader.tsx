/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { EuiFlyoutHeader, EuiFlyoutBody, EuiFlyoutFooter } from '@elastic/eui';

import type { Props } from './editor_flyout_content_container';

export const ContentEditorLoader: React.FC<Props> = (props) => {
  const [Editor, setEditor] = useState<React.ComponentType<Props> | null>(null);

  const loadEditor = useCallback(async () => {
    const { ContentEditorFlyoutContentContainer } = await import(
      './editor_flyout_content_container'
    );
    setEditor(() => ContentEditorFlyoutContentContainer);
  }, []);

  useEffect(() => {
    // On mount: load the editor asynchronously
    loadEditor();
  }, [loadEditor]);

  return Editor ? (
    <Editor {...props} />
  ) : (
    <>
      <EuiFlyoutHeader />
      <EuiFlyoutBody />
      <EuiFlyoutFooter />
    </>
  );
};
