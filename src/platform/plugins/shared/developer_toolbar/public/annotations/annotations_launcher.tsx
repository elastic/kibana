/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, lazy, useEffect, useState, type MouseEvent } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';

const LazyAnnotationsItem = lazy(() =>
  import('./annotations_item').then(({ AnnotationsItem }) => ({ default: AnnotationsItem }))
);

const LABEL = 'Comment mode';

/** The layer's own toggle shortcut (`⌘⇧K` / `Ctrl+Shift+K`), recognized here so that it works before the layer is loaded. */
const isToggleShortcut = (event: KeyboardEvent): boolean =>
  (event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'k';

// Focus stays on the page element the user was on; comment mode returns it there.
const preventFocusChange = (event: MouseEvent) => event.preventDefault();

const LauncherButton = ({ onClick, loading }: { onClick?: () => void; loading?: boolean }) => (
  <EuiToolTip content={LABEL} disableScreenReaderOutput>
    <EuiButtonIcon
      iconType="comment"
      aria-label={LABEL}
      aria-pressed={false}
      color="text"
      display="empty"
      isLoading={loading}
      onClick={onClick}
      onMouseDown={preventFocusChange}
      data-test-subj="kbnUiAnnotationsButton"
    />
  </EuiToolTip>
);

/**
 * Stands in for the annotations button until comment mode is first switched on
 * (button or shortcut): `@kbn/ui-annotations` and the screenshot library are
 * only loaded then, and stay out of the toolbar's page load.
 */
export const AnnotationsLauncher = ({ core }: { core: CoreStart }) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (isToggleShortcut(event)) {
        event.preventDefault();
        setLoaded(true);
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [loaded]);

  if (!loaded) {
    return <LauncherButton onClick={() => setLoaded(true)} />;
  }
  return (
    <Suspense fallback={<LauncherButton loading />}>
      <LazyAnnotationsItem core={core} initialActive />
    </Suspense>
  );
};
