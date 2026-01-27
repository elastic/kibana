/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { take, takeUntil, type Observable } from 'rxjs';

/**
 * Some EUI component can be toggled in Full screen (e.g. the EuiDataGrid). When they are toggled in full
 * screen we want to hide the chrome, and when they are toggled back to normal we want to show the chrome.
 * @internal
 */
export function handleEuiFullScreenChanges({
  isVisible$,
  stop$,
  setIsVisible,
}: {
  isVisible$: Observable<boolean>;
  stop$: Observable<void>;
  setIsVisible: (isVisible: boolean) => void;
}) {
  const { body } = document;
  // HTML class names that are added to the body when Eui components are toggled in full screen
  const classesOnBodyWhenEuiFullScreen = ['euiDataGrid__restrictBody'];

  let isChromeHiddenForEuiFullScreen = false;
  let isChromeVisible = false;

  isVisible$.pipe(takeUntil(stop$)).subscribe((isVisible) => {
    isChromeVisible = isVisible;
  });

  const onBodyClassesChange = () => {
    const { className } = body;
    if (
      classesOnBodyWhenEuiFullScreen.some((name) => className.includes(name)) &&
      isChromeVisible
    ) {
      isChromeHiddenForEuiFullScreen = true;
      setIsVisible(false);
    } else if (
      classesOnBodyWhenEuiFullScreen.every((name) => !className.includes(name)) &&
      !isChromeVisible &&
      isChromeHiddenForEuiFullScreen
    ) {
      isChromeHiddenForEuiFullScreen = false;
      setIsVisible(true);
    }
  };

  const mutationObserver = new MutationObserver((mutationList) => {
    mutationList.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        onBodyClassesChange();
      }
    });
  });

  mutationObserver.observe(body, { attributes: true });

  stop$.pipe(take(1)).subscribe(() => {
    mutationObserver.disconnect();
  });
}
