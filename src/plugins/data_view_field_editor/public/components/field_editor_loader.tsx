/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { EuiFlyoutHeader, EuiFlyoutBody, EuiFlyoutFooter } from '@elastic/eui';

import type { Props } from './field_editor_flyout_content_container';

export const FieldEditorLoader: React.FC<Props> = (props) => {
  const [Editor, setEditor] = useState<React.ComponentType<Props> | null>(null);

  const loadEditor = useCallback(async () => {
    const { FieldEditorFlyoutContentContainer } = await import(
      './field_editor_flyout_content_container'
    );
    setEditor(() => FieldEditorFlyoutContentContainer);
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
