/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { EuiFlyoutHeader, EuiFlyoutBody, EuiFlyoutFooter, EuiThemeProvider } from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import { Observable, of } from 'rxjs';

import { Theme } from '../services';
import type { Props } from './editor_flyout_content_container';

const themeDefault = { darkMode: false };

export const ContentEditorLoader: React.FC<Props & { theme$?: Observable<Theme> }> = ({
  theme$,
  ...rest
}) => {
  const [Editor, setEditor] = useState<React.ComponentType<Props> | null>(null);
  const { darkMode } = useObservable(theme$ ?? of(themeDefault), themeDefault);

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
    <EuiThemeProvider colorMode={darkMode ? 'dark' : 'light'}>
      <Editor {...rest} />
    </EuiThemeProvider>
  ) : (
    <>
      <EuiFlyoutHeader />
      <EuiFlyoutBody />
      <EuiFlyoutFooter />
    </>
  );
};
