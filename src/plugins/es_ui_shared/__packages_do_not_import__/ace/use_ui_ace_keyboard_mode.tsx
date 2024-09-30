/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef } from 'react';
import * as ReactDOM from 'react-dom';
import { keys, EuiText } from '@elastic/eui';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

import './_ui_ace_keyboard_mode.scss';
import type { AnalyticsServiceStart, I18nStart, ThemeServiceStart } from '@kbn/core/public';

interface StartServices {
  analytics: Pick<AnalyticsServiceStart, 'reportEvent'>;
  i18n: I18nStart;
  theme: Pick<ThemeServiceStart, 'theme$'>;
}

const OverlayText = (startServices: StartServices) => (
  // The point of this element is for accessibility purposes, so ignore eslint error
  // in this case
  //
  <KibanaRenderContextProvider {...startServices}>
    <EuiText size="s" data-test-subj="a11y-overlay">
      Press Enter to start editing.
    </EuiText>
    <EuiText size="s">When you&rsquo;re done, press Escape to stop editing.</EuiText>
  </KibanaRenderContextProvider>
);

export function useUIAceKeyboardMode(
  aceTextAreaElement: HTMLTextAreaElement | null,
  startServices: StartServices,
  isAccessibilityOverlayEnabled: boolean = true
) {
  const overlayMountNode = useRef<HTMLDivElement | null>(null);
  const autoCompleteVisibleRef = useRef<boolean>(false);
  useEffect(() => {
    function onDismissOverlay(event: KeyboardEvent) {
      if (event.key === keys.ENTER) {
        event.preventDefault();
        aceTextAreaElement!.focus();
      }
    }

    function enableOverlay() {
      if (overlayMountNode.current) {
        overlayMountNode.current.focus();
      }
    }

    const isAutoCompleteVisible = () => {
      const autoCompleter = document.querySelector<HTMLDivElement>('.ace_autocomplete');
      if (!autoCompleter) {
        return false;
      }
      // The autoComplete is just hidden when it's closed, not removed from the DOM.
      return autoCompleter.style.display !== 'none';
    };

    const documentKeyDownListener = () => {
      autoCompleteVisibleRef.current = isAutoCompleteVisible();
    };

    const aceKeydownListener = (event: KeyboardEvent) => {
      if (event.key === keys.ESCAPE && !autoCompleteVisibleRef.current) {
        event.preventDefault();
        event.stopPropagation();
        enableOverlay();
      }
    };
    if (aceTextAreaElement && isAccessibilityOverlayEnabled) {
      // We don't control HTML elements inside of ace so we imperatively create an element
      // that acts as a container and insert it just before ace's textarea element
      // so that the overlay lives at the correct spot in the DOM hierarchy.
      overlayMountNode.current = document.createElement('div');
      overlayMountNode.current.className = 'kbnUiAceKeyboardHint';
      overlayMountNode.current.setAttribute('role', 'application');
      overlayMountNode.current.tabIndex = 0;
      overlayMountNode.current.addEventListener('focus', enableOverlay);
      overlayMountNode.current.addEventListener('keydown', onDismissOverlay);

      ReactDOM.render(<OverlayText {...startServices} />, overlayMountNode.current);

      aceTextAreaElement.parentElement!.insertBefore(overlayMountNode.current, aceTextAreaElement);
      aceTextAreaElement.setAttribute('tabindex', '-1');

      // Order of events:
      // 1. Document capture event fires first and we check whether an autocomplete menu is open on keydown
      //    (not ideal because this is scoped to the entire document).
      // 2. Ace changes it's state (like hiding or showing autocomplete menu)
      // 3. We check what button was pressed and whether autocomplete was visible then determine
      //    whether it should act like a dismiss or if we should display an overlay.
      document.addEventListener('keydown', documentKeyDownListener, { capture: true });
      aceTextAreaElement.addEventListener('keydown', aceKeydownListener);
    }
    return () => {
      if (aceTextAreaElement && isAccessibilityOverlayEnabled) {
        document.removeEventListener('keydown', documentKeyDownListener, { capture: true });
        aceTextAreaElement.removeEventListener('keydown', aceKeydownListener);
        const textAreaContainer = aceTextAreaElement.parentElement;
        if (textAreaContainer && textAreaContainer.contains(overlayMountNode.current!)) {
          textAreaContainer.removeChild(overlayMountNode.current!);
        }
      }
    };
  }, [aceTextAreaElement, startServices, isAccessibilityOverlayEnabled]);
}
