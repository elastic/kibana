/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';
import { DataReferencePicker } from './data_reference_picker';

export interface ReferenceSelectionBridge {
  readonly focus: () => void;
  readonly getCaret: () => number;
  readonly setCaret: (offset: number) => void;
}

export interface ReferenceCapableBind {
  readonly value: string;
  readonly isOpen: boolean;
  readonly teachingPlaceholder: string;
  readonly atButton: React.ReactElement;
  /** Report a text edit; opens the picker when `@` or `{{` was typed at the caret. */
  readonly reportChange: (next: string, caret: number) => void;
  readonly togglePicker: () => void;
  readonly closePicker: () => void;
  readonly attachInputRef: (el: HTMLInputElement | HTMLTextAreaElement | null) => void;
  readonly registerSelection: (bridge: ReferenceSelectionBridge) => void;
}

/**
 * Shared reference affordance for every templatable field control: @ button,
 * typed `@` / `{{` triggers, teaching placeholder, and picker chrome.
 */
export function ReferenceCapableField({
  catalog,
  value,
  onChange,
  children,
  'data-test-subj': dataTestSubj = 'workflowStepConfigDataReference',
}: {
  readonly catalog: DataReferenceCatalog;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly children: (bind: ReferenceCapableBind) => React.ReactElement;
  readonly 'data-test-subj'?: string;
}) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const selectionBridgeRef = useRef<ReferenceSelectionBridge | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const replaceRangeRef = useRef<{ start: number; end: number } | null>(null);
  const caretOnOpenRef = useRef(0);

  const insertLabel = i18n.translate('workflows.stepConfigPanel.insertDataReference', {
    defaultMessage: 'Insert data from a prior step',
  });
  const teachingPlaceholder = i18n.translate('workflows.stepConfigPanel.typeAtToInsert', {
    defaultMessage: 'Type @ to insert data',
  });

  const focusAndSetCaret = useCallback((offset: number) => {
    const bridge = selectionBridgeRef.current;
    if (bridge) {
      bridge.setCaret(offset);
      bridge.focus();
      return;
    }
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(offset, offset);
  }, []);

  const closePicker = useCallback(() => {
    setIsOpen(false);
    replaceRangeRef.current = null;
    focusAndSetCaret(caretOnOpenRef.current);
  }, [focusAndSetCaret]);

  const openPicker = useCallback(
    (replaceRange: { start: number; end: number } | null) => {
      const bridge = selectionBridgeRef.current;
      caretOnOpenRef.current = bridge?.getCaret() ?? inputRef.current?.selectionStart ?? value.length;
      replaceRangeRef.current = replaceRange;
      setIsOpen(true);
    },
    [value.length]
  );

  const handleInsert = useCallback(
    (token: string) => {
      const bridge = selectionBridgeRef.current;
      const caret =
        bridge?.getCaret() ?? inputRef.current?.selectionStart ?? value.length;
      const range = replaceRangeRef.current ?? { start: caret, end: caret };
      const next = `${value.slice(0, range.start)}${token}${value.slice(range.end)}`;
      onChange(next);
      setIsOpen(false);
      replaceRangeRef.current = null;
      window.requestAnimationFrame(() => {
        focusAndSetCaret(range.start + token.length);
      });
    },
    [focusAndSetCaret, onChange, value]
  );

  const reportChange = useCallback(
    (next: string, caret: number) => {
      onChange(next);
      const before = next.slice(0, caret);
      if (before.endsWith('{{')) {
        openPicker({ start: caret - 2, end: caret });
      } else if (before.endsWith('@')) {
        openPicker({ start: caret - 1, end: caret });
      }
    },
    [onChange, openPicker]
  );

  const togglePicker = useCallback(() => {
    if (isOpen) {
      closePicker();
      return;
    }
    const bridge = selectionBridgeRef.current;
    const caret =
      bridge?.getCaret() ?? inputRef.current?.selectionStart ?? value.length;
    openPicker({ start: caret, end: caret });
  }, [closePicker, isOpen, openPicker, value.length]);

  const atButton = (
    <EuiToolTip content={insertLabel} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="at"
        color={isOpen ? 'primary' : 'text'}
        size="xs"
        aria-label={insertLabel}
        aria-pressed={isOpen}
        onClick={togglePicker}
        data-test-subj={dataTestSubj}
      />
    </EuiToolTip>
  );

  const bind: ReferenceCapableBind = {
    value,
    isOpen,
    teachingPlaceholder,
    atButton,
    reportChange,
    togglePicker,
    closePicker,
    attachInputRef: (el) => {
      inputRef.current = el;
    },
    registerSelection: (bridge) => {
      selectionBridgeRef.current = bridge;
    },
  };

  return (
    <DataReferencePicker
      catalog={catalog}
      isOpen={isOpen}
      onClose={closePicker}
      onInsert={handleInsert}
      input={children(bind)}
    />
  );
}
