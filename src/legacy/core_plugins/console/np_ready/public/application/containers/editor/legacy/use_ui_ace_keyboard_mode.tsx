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
import { render, unmountComponentAtNode } from 'react-dom';
import { keyCodes, EuiText } from '@elastic/eui';

const Overlay = ({
  onMount,
  onKeyDown,
}: {
  onMount: (ref: HTMLDivElement) => void;
  onKeyDown: (ev: React.KeyboardEvent) => void;
}) => (
  // The point of this element is for accessibility purposes, so ignore eslint error
  // in this case
  //
  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
  <div ref={onMount} onKeyDown={onKeyDown}>
    <EuiText size="s">Press Enter to start editing.</EuiText>
    <EuiText size="s">When you&rsquo;re done, press Escape to stop editing.</EuiText>
  </div>
);

export function useUIAceKeyboardMode(aceTextAreaElement: HTMLTextAreaElement | null) {
  const mountNode = useRef<HTMLDivElement | null>(null);
  const autoCompleteVisibleRef = useRef<boolean>(false);

  function onDismissOverlay(ev: React.KeyboardEvent) {
    if (ev.keyCode === keyCodes.ENTER) {
      ev.preventDefault();
      unmountComponentAtNode(mountNode.current!);
      aceTextAreaElement!.focus();
    }
  }

  function enableOverlay() {
    render(
      <Overlay onKeyDown={onDismissOverlay} onMount={ref => ref && ref.focus()} />,
      mountNode.current!
    );
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

  const aceKeydownListener = (ev: KeyboardEvent) => {
    if (ev.keyCode === keyCodes.ESCAPE && !autoCompleteVisibleRef.current) {
      ev.preventDefault();
      ev.stopPropagation();
      enableOverlay();
    }
  };

  useEffect(() => {
    if (aceTextAreaElement) {
      const container = document.createElement('div');
      container.className = 'kbnUiAceKeyboardHint';
      container.setAttribute('role', 'application');
      container.tabIndex = 0;
      container.addEventListener('focus', () => {
        enableOverlay();
      });
      aceTextAreaElement.parentElement!.insertBefore(container, aceTextAreaElement);

      mountNode.current = container;
      aceTextAreaElement.setAttribute('tabindex', '-1');

      // This listener fires on capture phase so that we get a look at the world before ace changes it.
      document.addEventListener('keydown', documentKeyDownListener, { capture: true });
      aceTextAreaElement.addEventListener('keydown', aceKeydownListener);
    }
    return () => {
      if (aceTextAreaElement) {
        document.removeEventListener('keydown', documentKeyDownListener);
        aceTextAreaElement.removeEventListener('keydown', aceKeydownListener);
        document.removeChild(mountNode.current!);
      }
    };
  }, [aceTextAreaElement]);
}
