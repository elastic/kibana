/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { monaco } from '@kbn/monaco';
import React, { useCallback, useEffect, useState } from 'react';
import type { RefObject } from 'react';

export interface AlertRuleRegionLabelMeta {
  baseStartLine: number;
  baseEndLine: number;
  conditionStartLine: number;
  conditionEndLine: number;
  hasCondition: boolean;
  /** When false, the BASE label is hidden (e.g. entire query highlighted as CONDITION). */
  hasBase?: boolean;
}

function getBlockCenterTopPx(
  editor: monaco.editor.IStandaloneCodeEditor,
  startLine: number,
  endLine: number
): number | undefined {
  const topStart = editor.getScrolledVisiblePosition({ lineNumber: startLine, column: 1 });
  const topEnd = editor.getScrolledVisiblePosition({ lineNumber: endLine, column: 1 });
  if (!topStart || !topEnd) {
    return undefined;
  }
  const blockTop = Math.min(topStart.top, topEnd.top);
  const blockBottom = Math.max(topStart.top + topStart.height, topEnd.top + topEnd.height);
  return (blockTop + blockBottom) / 2;
}

export function AlertRuleQueryRegionLabels({
  active,
  editorRef,
  meta,
}: {
  active: boolean;
  editorRef: RefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  meta: AlertRuleRegionLabelMeta | null;
}) {
  const { euiTheme } = useEuiTheme();
  const [baseTop, setBaseTop] = useState<number | undefined>(undefined);
  const [conditionTop, setConditionTop] = useState<number | undefined>(undefined);

  const updatePositions = useCallback(() => {
    const editor = editorRef.current;
    if (!active || !meta || !editor) {
      setBaseTop(undefined);
      setConditionTop(undefined);
      return;
    }

    const baseCenter = getBlockCenterTopPx(editor, meta.baseStartLine, meta.baseEndLine);
    setBaseTop(baseCenter);

    if (meta.hasCondition) {
      const condCenter = getBlockCenterTopPx(
        editor,
        meta.conditionStartLine,
        meta.conditionEndLine
      );
      setConditionTop(condCenter);
    } else {
      setConditionTop(undefined);
    }
  }, [active, editorRef, meta]);

  useEffect(() => {
    updatePositions();
  }, [updatePositions]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!active || !meta || !editor) {
      return;
    }

    const d1 = editor.onDidScrollChange(() => updatePositions());
    const d2 = editor.onDidLayoutChange(() => updatePositions());
    const d3 = editor.onDidContentSizeChange(() => updatePositions());

    return () => {
      d1.dispose();
      d2.dispose();
      d3.dispose();
    };
  }, [active, editorRef, meta, updatePositions]);

  if (!active || !meta) {
    return null;
  }

  const baseLabel = i18n.translate('esqlEditor.alertRuleHighlight.baseLabel', {
    defaultMessage: 'BASE',
  });
  const conditionLabel = i18n.translate('esqlEditor.alertRuleHighlight.conditionLabel', {
    defaultMessage: 'CONDITION',
  });

  const labelCss = (color: string) => css`
    position: absolute;
    right: ${euiTheme.size.s};
    transform: translateY(-50%);
    pointer-events: none;
    z-index: 2;
    font-size: 8pt;
    line-height: 1;
    font-weight: ${euiTheme.font.weight.bold};
    letter-spacing: 0.04em;
    color: ${color};
  `;

  return (
    <>
      {meta.hasBase !== false && baseTop !== undefined && (
        <div
          css={labelCss(euiTheme.colors.primaryText)}
          style={{ top: baseTop }}
          data-test-subj="esqlAlertRuleHighlightBaseLabel"
        >
          {baseLabel}
        </div>
      )}
      {meta.hasCondition && conditionTop !== undefined && (
        <div
          css={labelCss(euiTheme.colors.accentText)}
          style={{ top: conditionTop }}
          data-test-subj="esqlAlertRuleHighlightConditionLabel"
        >
          {conditionLabel}
        </div>
      )}
    </>
  );
}
