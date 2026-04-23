/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiOutsideClickDetector,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { monaco } from '@kbn/monaco';
import type { RefObject } from 'react';
import {
  getAlertRuleSplitMenuShortcutLabels,
  runCopyBase,
  runCopyCondition,
  runResetToAutomaticSplit,
  runSetAsRuleCondition,
  type AlertRuleSplitContextMenuCallbacks,
} from './alert_rule_split_context_menu';
import { getAlertRuleCopySegments } from './split_esql_base_condition';

export interface AlertRuleQueryContextMenuProps {
  active: boolean;
  editorRef: RefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  callbacks: AlertRuleSplitContextMenuCallbacks;
}

/**
 * Right-click menu with only alert-rule actions. Monaco’s built-in context menu is disabled
 * (`contextmenu: false`); this listener uses capture to replace it while `active` is true.
 */
export function AlertRuleQueryContextMenu({
  active,
  editorRef,
  callbacks,
}: AlertRuleQueryContextMenuProps) {
  const { euiTheme } = useEuiTheme();
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const listenerRef = useRef<{
    node: HTMLElement;
    handler: (ev: MouseEvent) => void;
  } | null>(null);

  const close = useCallback(() => setCoords(null), []);

  useEffect(() => {
    if (!active) {
      setCoords(null);
      return;
    }

    let cancelled = false;

    const attach = () => {
      if (cancelled) {
        return;
      }
      const editor = editorRef.current;
      const node = editor?.getDomNode() ?? null;
      if (!node) {
        if (!cancelled) {
          requestAnimationFrame(attach);
        }
        return;
      }

      const handler = (ev: MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        setCoords({ x: ev.clientX, y: ev.clientY });
      };

      node.addEventListener('contextmenu', handler, true);
      listenerRef.current = { node, handler };
    };

    attach();

    return () => {
      cancelled = true;
      const cur = listenerRef.current;
      if (cur) {
        cur.node.removeEventListener('contextmenu', cur.handler, true);
        listenerRef.current = null;
      }
    };
  }, [active, editorRef]);

  useEffect(() => {
    if (!coords) {
      return;
    }
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        close();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [coords, close]);

  if (!active || !coords) {
    return null;
  }

  const editor = editorRef.current;
  const model = editor?.getModel();
  const query = model?.getValue() ?? '';
  const override = callbacks.getConditionRangeOverride?.() ?? null;
  const { baseText, conditionText } = getAlertRuleCopySegments(query, override);

  const setAsRuleConditionLabel = i18n.translate(
    'esqlEditor.alertRuleContextMenu.setAsRuleCondition',
    {
      defaultMessage: 'Set as rule condition',
    }
  );
  const resetToAutomaticSplitLabel = i18n.translate(
    'esqlEditor.alertRuleContextMenu.resetToAutomaticSplit',
    {
      defaultMessage: 'Reset to automatic split',
    }
  );
  const copyBaseLabel = i18n.translate('esqlEditor.alertRuleContextMenu.copyBase', {
    defaultMessage: 'Copy BASE',
  });
  const copyConditionLabel = i18n.translate('esqlEditor.alertRuleContextMenu.copyCondition', {
    defaultMessage: 'Copy CONDITION',
  });

  const shortcuts = getAlertRuleSplitMenuShortcutLabels();

  const menuItemWithShortcut = (label: string, shortcut: string) => (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      justifyContent="spaceBetween"
      responsive={false}
      css={css`
        width: 100%;
        min-width: 0;
      `}
    >
      <EuiFlexItem grow={false}>{label}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText
          size="s"
          color="subdued"
          css={css`
            white-space: nowrap;
            font-variant-numeric: tabular-nums;
          `}
        >
          {shortcut}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiOutsideClickDetector onOutsideClick={close}>
      <div
        role="presentation"
        data-test-subj="esqlAlertRuleQueryContextMenu"
        css={css`
          position: fixed;
          left: ${coords.x}px;
          top: ${coords.y}px;
          z-index: ${euiTheme.levels.flyout};
          min-width: 280px;
        `}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <EuiPanel paddingSize="none" hasShadow borderRadius="m">
          <EuiContextMenuPanel size="s">
            <EuiContextMenuItem
              data-test-subj="esqlAlertRuleQueryContextMenu-setCondition"
              onClick={() => {
                const ed = editorRef.current;
                if (ed) {
                  runSetAsRuleCondition(ed, callbacks);
                }
                close();
              }}
            >
              {menuItemWithShortcut(setAsRuleConditionLabel, shortcuts.setAsRuleCondition)}
            </EuiContextMenuItem>
            <EuiHorizontalRule margin="none" />
            <EuiContextMenuItem
              data-test-subj="esqlAlertRuleQueryContextMenu-resetAutomaticSplit"
              onClick={() => {
                runResetToAutomaticSplit(callbacks);
                close();
              }}
            >
              {resetToAutomaticSplitLabel}
            </EuiContextMenuItem>
            <EuiContextMenuItem
              data-test-subj="esqlAlertRuleQueryContextMenu-copyBase"
              disabled={!baseText}
              onClick={() => {
                const ed = editorRef.current;
                if (ed) {
                  runCopyBase(ed, callbacks);
                }
                close();
              }}
            >
              {copyBaseLabel}
            </EuiContextMenuItem>
            <EuiContextMenuItem
              data-test-subj="esqlAlertRuleQueryContextMenu-copyCondition"
              disabled={!conditionText}
              onClick={() => {
                const ed = editorRef.current;
                if (ed) {
                  runCopyCondition(ed, callbacks);
                }
                close();
              }}
            >
              {copyConditionLabel}
            </EuiContextMenuItem>
          </EuiContextMenuPanel>
        </EuiPanel>
      </div>
    </EuiOutsideClickDetector>
  );
}
