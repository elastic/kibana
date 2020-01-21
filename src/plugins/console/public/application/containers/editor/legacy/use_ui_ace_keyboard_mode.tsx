/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, { useEffect, useRef } from 'react';
import * as ReactDOM from 'react-dom';
import { keyCodes, EuiText } from '@elastic/eui';

const OverlayText = () => (
  // The point of this element is for accessibility purposes, so ignore eslint error
  // in this case
  //
  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
  <>
    <EuiText size="s">Press Enter to start editing.</EuiText>
    <EuiText size="s">When you&rsquo;re done, press Escape to stop editing.</EuiText>
  </>
);

export function useUIAceKeyboardMode(aceTextAreaElement: HTMLTextAreaElement | null) {
  const overlayMountNode = useRef<HTMLDivElement | null>(null);
  const autoCompleteVisibleRef = useRef<boolean>(false);

  useEffect(() => {
    function onDismissOverlay(event: KeyboardEvent) {
      if (event.keyCode === keyCodes.ENTER) {
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
      if (event.keyCode === keyCodes.ESCAPE && !autoCompleteVisibleRef.current) {
        event.preventDefault();
        event.stopPropagation();
        enableOverlay();
      }
    };
    if (aceTextAreaElement) {
      // We don't control HTML elements inside of ace so we imperatively create an element
      // that acts as a container and insert it just before ace's textarea element
      // so that the overlay lives at the correct spot in the DOM hierarchy.
      overlayMountNode.current = document.createElement('div');
      overlayMountNode.current.className = 'kbnUiAceKeyboardHint';
      overlayMountNode.current.setAttribute('role', 'application');
      overlayMountNode.current.tabIndex = 0;
      overlayMountNode.current.addEventListener('focus', enableOverlay);
      overlayMountNode.current.addEventListener('keydown', onDismissOverlay);

      ReactDOM.render(<OverlayText />, overlayMountNode.current);

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
      if (aceTextAreaElement) {
        document.removeEventListener('keydown', documentKeyDownListener);
        aceTextAreaElement.removeEventListener('keydown', aceKeydownListener);
        const textAreaContainer = aceTextAreaElement.parentElement;
        if (textAreaContainer && textAreaContainer.contains(overlayMountNode.current!)) {
          textAreaContainer.removeChild(overlayMountNode.current!);
        }
      }
    };
  }, [aceTextAreaElement]);
}
