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
import React, { useEffect, useState, useRef } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { keyCodes } from '@elastic/eui';

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
  <div
    ref={onMount}
    onKeyDown={onKeyDown}
    className="kbnUiAceKeyboardHint"
    tabIndex={0}
    role="application"
  >
    <p className="kuiText kuiVerticalRhythmSmall">Press Enter to start editing.</p>
    <p className="kuiText kuiVerticalRhythmSmall">
      When you&rsquo;re done, press Escape to stop editing.
    </p>
  </div>
);

export function useUIAceKeyboardMode(aceTextAreaElement: HTMLTextAreaElement | null) {
  const textArea = useRef<HTMLTextAreaElement | null>(null);
  const mountNode = useRef<HTMLDivElement | null>(null);
  const [isAutoCompleteOpen, setAutoCompleteOpen] = useState<boolean>(false);

  function onDismissOverlay(ev: React.KeyboardEvent) {
    if (ev.keyCode === keyCodes.ENTER) {
      ev.preventDefault();
      unmountComponentAtNode(mountNode.current!);
      textArea.current!.focus();
    }
  }

  function enableOverlay() {
    render(
      <Overlay onKeyDown={onDismissOverlay} onMount={ref => ref && ref.focus()} />,
      mountNode.current!
    );
  }

  const autoCompleteOpenListener = () => {
    const autoCompleter = document.querySelector<HTMLDivElement>('.ace_autocomplete');

    if (!autoCompleter) {
      setAutoCompleteOpen(false);
      return;
    }

    // The autoComplete is just hidden when it's closed, not removed from the DOM.
    setAutoCompleteOpen(autoCompleter.style.display !== 'none');
  };

  const aceTextBoxListener = (ev: KeyboardEvent) => {
    if (ev.keyCode === keyCodes.ESCAPE) {
      // If the autocompletion context menu is open then we want to let ESC close it but
      // **not** exit out of editing mode.
      if (!isAutoCompleteOpen) {
        ev.preventDefault();
        ev.stopPropagation();
        enableOverlay();
      }
    }
  };

  useEffect(() => {
    if (aceTextAreaElement) {
      const container = document.createElement('div');
      aceTextAreaElement.parentElement!.insertBefore(container, aceTextAreaElement);

      mountNode.current = container;
      textArea.current = aceTextAreaElement;

      document.addEventListener('keydown', autoCompleteOpenListener, { capture: true });
      textArea.current.addEventListener('keydown', aceTextBoxListener);
    }
    return () => {
      if (aceTextAreaElement) {
        aceTextAreaElement.removeEventListener('keydown', aceTextBoxListener);
        document.removeEventListener('keydown', autoCompleteOpenListener);
        document.removeChild(mountNode.current!);
      }
    };
  }, [aceTextAreaElement]);
}
