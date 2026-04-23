/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { copyToClipboard } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';
import { isMac } from '@kbn/shared-ux-utility';
import {
  getAlertRuleCopySegments,
  type AlertRuleConditionRangeOverride,
} from './split_esql_base_condition';

/**
 * Keyboard shortcuts (only active while these actions are registered — alert-rule context).
 * Avoids existing ES|QL chords: Ctrl/Cmd+Enter, +K, +I, +/ and Chrome’s Ctrl/Cmd+Shift+B (bookmark bar).
 *
 * - **Set as rule condition:** `Ctrl+Alt+C` (Win/Linux) or `⌘⌥C` (macOS) — **C**ondition
 */
const KEY_SET_CONDITION =
  // eslint-disable-next-line no-bitwise
  monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyC;

/** Label for the context menu, aligned with `KEY_SET_CONDITION`. */
export function getAlertRuleSplitMenuShortcutLabels(): {
  setAsRuleCondition: string;
} {
  if (isMac) {
    return { setAsRuleCondition: '⌘⌥C' };
  }
  return { setAsRuleCondition: 'Ctrl+Alt+C' };
}

export interface AlertRuleSplitContextMenuCallbacks {
  setConditionRangeOverride: (range: AlertRuleConditionRangeOverride | null) => void;
  /** Current override from the host (Discover / form state). */
  getConditionRangeOverride?: () => AlertRuleConditionRangeOverride | null;
}

function getSelectionOffsets(editor: monaco.editor.IStandaloneCodeEditor): {
  start: number;
  end: number;
} | null {
  const model = editor.getModel();
  const sel = editor.getSelection();
  if (!model || !sel || sel.isEmpty()) {
    return null;
  }
  const o1 = model.getOffsetAt(sel.getStartPosition());
  const o2 = model.getOffsetAt(sel.getEndPosition());
  const start = Math.min(o1, o2);
  const end = Math.max(o1, o2);
  if (end === start) {
    return null;
  }
  return { start, end };
}

/** Runs the same logic as the context menu / keybinding for “Set as rule condition”. */
export function runSetAsRuleCondition(
  editor: monaco.editor.IStandaloneCodeEditor,
  callbacks: AlertRuleSplitContextMenuCallbacks
): void {
  const range = getSelectionOffsets(editor);
  if (!range) {
    return;
  }
  callbacks.setConditionRangeOverride({ start: range.start, end: range.end });
}

/** Clears manual split and restores automatic detection (first top-level `| WHERE …`). */
export function runResetToAutomaticSplit(callbacks: AlertRuleSplitContextMenuCallbacks): void {
  callbacks.setConditionRangeOverride(null);
}

export function runCopyBase(
  editor: monaco.editor.IStandaloneCodeEditor,
  callbacks: AlertRuleSplitContextMenuCallbacks
): void {
  const model = editor.getModel();
  if (!model) {
    return;
  }
  const query = model.getValue();
  const override = callbacks.getConditionRangeOverride?.() ?? null;
  const { baseText } = getAlertRuleCopySegments(query, override);
  if (baseText) {
    copyToClipboard(baseText);
  }
}

export function runCopyCondition(
  editor: monaco.editor.IStandaloneCodeEditor,
  callbacks: AlertRuleSplitContextMenuCallbacks
): void {
  const model = editor.getModel();
  if (!model) {
    return;
  }
  const query = model.getValue();
  const override = callbacks.getConditionRangeOverride?.() ?? null;
  const { conditionText } = getAlertRuleCopySegments(query, override);
  if (conditionText) {
    copyToClipboard(conditionText);
  }
}

/**
 * Registers keybindings only (no Monaco context menu — the flyout uses `AlertRuleQueryContextMenu`).
 * Dispose when alert-rule highlight mode ends.
 */
export function registerAlertRuleSplitEditorActions(
  editor: monaco.editor.IStandaloneCodeEditor,
  callbacks: AlertRuleSplitContextMenuCallbacks
): monaco.IDisposable {
  return editor.addAction({
    id: 'esql.alertRule.setAsRuleCondition',
    label: i18n.translate('esqlEditor.alertRuleContextMenu.setAsRuleCondition', {
      defaultMessage: 'Set as rule condition',
    }),
    keybindings: [KEY_SET_CONDITION],
    run: (ed) => {
      runSetAsRuleCondition(ed, callbacks);
    },
  });
}
