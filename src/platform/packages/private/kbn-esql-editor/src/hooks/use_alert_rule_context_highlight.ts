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
import { monaco } from '@kbn/monaco';
import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import type { AlertRuleRegionLabelMeta } from '../alert_rule_query_region_labels';
import { getRangeFromOffsets } from '../resource_browser/utils';
import {
  getAlertRuleSplitPlan,
  type AlertRuleConditionRangeOverride,
  type AlertRuleSplitPlan,
} from '../split_esql_base_condition';

/** Region fill — primary-tinted band for BASE. */
const BASE_CLASS = 'esqlEditorAlertRuleBaseHighlight';
/** Line-decorations gutter — primary strong border. */
const BASE_GUTTER_CLASS = 'esqlEditorAlertRuleBaseGutter';
/** Region fill — accent-tinted band for CONDITION. */
const CONDITION_CLASS = 'esqlEditorAlertRuleConditionHighlight';
/** Line-decorations gutter — accent strong border. */
const CONDITION_GUTTER_CLASS = 'esqlEditorAlertRuleConditionGutter';

/** Lower than 50% so `backgroundBaseInteractiveSelect` on selected text stays distinct on both tints. */
const REGION_TINT_RATIO = 0.36;

function pushBaseDecorations(
  model: monaco.editor.ITextModel,
  newDecorations: monaco.editor.IModelDeltaDecoration[],
  startOffset: number,
  endOffset: number
) {
  if (startOffset >= endOffset) {
    return;
  }
  const r = getRangeFromOffsets(model, startOffset, endOffset);
  newDecorations.push({
    range: new monaco.Range(
      r.startLineNumber,
      r.startColumn,
      r.endLineNumber,
      r.endColumn
    ),
    options: {
      className: BASE_CLASS,
      linesDecorationsClassName: BASE_GUTTER_CLASS,
      isWholeLine: true,
      stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
    },
  });
}

function pushConditionDecorations(
  model: monaco.editor.ITextModel,
  newDecorations: monaco.editor.IModelDeltaDecoration[],
  startOffset: number,
  endOffset: number
) {
  if (startOffset >= endOffset) {
    return;
  }
  const r = getRangeFromOffsets(model, startOffset, endOffset);
  newDecorations.push({
    range: new monaco.Range(
      r.startLineNumber,
      r.startColumn,
      r.endLineNumber,
      r.endColumn
    ),
    options: {
      className: CONDITION_CLASS,
      linesDecorationsClassName: CONDITION_GUTTER_CLASS,
      isWholeLine: true,
      stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
    },
  });
}

function setRegionMetaForPlan(
  model: monaco.editor.ITextModel,
  plan: AlertRuleSplitPlan,
  len: number,
  lineCount: number
): AlertRuleRegionLabelMeta {
  if (plan.kind === 'all-base') {
    return {
      baseStartLine: 1,
      baseEndLine: lineCount,
      conditionStartLine: lineCount,
      conditionEndLine: lineCount,
      hasCondition: false,
      hasBase: true,
    };
  }
  if (plan.kind === 'all-condition') {
    return {
      baseStartLine: 1,
      baseEndLine: 1,
      conditionStartLine: 1,
      conditionEndLine: lineCount,
      hasCondition: true,
      hasBase: false,
    };
  }
  if (plan.kind === 'split') {
    const baseRange = getRangeFromOffsets(model, 0, plan.conditionStartOffset);
    const condRange = getRangeFromOffsets(model, plan.conditionStartOffset, len);
    return {
      baseStartLine: baseRange.startLineNumber,
      baseEndLine: baseRange.endLineNumber,
      conditionStartLine: condRange.startLineNumber,
      conditionEndLine: condRange.endLineNumber,
      hasCondition: true,
      hasBase: true,
    };
  }
  // range
  const { conditionStart: cs, conditionEnd: ce } = plan;
  const condRange = getRangeFromOffsets(model, cs, ce);
  let baseStartLine = 1;
  let baseEndLine = 1;
  if (cs > 0) {
    const leadBase = getRangeFromOffsets(model, 0, cs);
    baseStartLine = leadBase.startLineNumber;
    baseEndLine = leadBase.endLineNumber;
  } else if (ce < len) {
    const trailBase = getRangeFromOffsets(model, ce, len);
    baseStartLine = trailBase.startLineNumber;
    baseEndLine = trailBase.endLineNumber;
  }
  return {
    baseStartLine,
    baseEndLine,
    conditionStartLine: condRange.startLineNumber,
    conditionEndLine: condRange.endLineNumber,
    hasCondition: true,
    hasBase: cs > 0 || ce < len,
  };
}

export function useAlertRuleContextHighlight({
  active,
  editorModel,
  queryText,
  conditionRangeOverride,
}: {
  active: boolean;
  editorModel: React.MutableRefObject<monaco.editor.ITextModel | undefined>;
  /** Bumps the effect when the editor value changes so highlights apply after mount. */
  queryText: string;
  /**
   * When non-null, this character range is CONDITION; `null` uses automatic `| WHERE` detection.
   */
  conditionRangeOverride: AlertRuleConditionRangeOverride | null;
}) {
  const { euiTheme } = useEuiTheme();
  const decorationIdsRef = useRef<string[]>([]);
  const [regionMeta, setRegionMeta] = useState<AlertRuleRegionLabelMeta | null>(null);

  const alertRuleContextHighlightStyle = useMemo(
    () => css`
      .${BASE_CLASS} {
        background-color: color-mix(
          in srgb,
          ${euiTheme.colors.backgroundLightPrimary} ${REGION_TINT_RATIO * 100}%,
          transparent
        ) !important;
      }
      .${CONDITION_CLASS} {
        background-color: color-mix(
          in srgb,
          ${euiTheme.colors.backgroundLightAccent} ${REGION_TINT_RATIO * 100}%,
          transparent
        ) !important;
      }
      /* Neutral interactive fill so selection reads clearly on both primary- and accent-tinted lines */
      .ESQLEditor .monaco-editor .view-overlays .selected-text {
        background-color: ${euiTheme.colors.backgroundBaseInteractiveSelect} !important;
      }
      /* Renders in Monaco’s line-decorations column (between line numbers and text). */
      .${BASE_GUTTER_CLASS} {
        box-sizing: border-box;
        width: 100% !important;
        height: 100% !important;
        border-left: ${euiTheme.size.xs} solid ${euiTheme.colors.borderStrongPrimary};
      }
      .${CONDITION_GUTTER_CLASS} {
        box-sizing: border-box;
        width: 100% !important;
        height: 100% !important;
        border-left: ${euiTheme.size.xs} solid ${euiTheme.colors.borderStrongAccent};
      }
    `,
    [euiTheme]
  );

  useEffect(() => {
    const model = editorModel.current;
    if (!active) {
      if (model) {
        decorationIdsRef.current = model.deltaDecorations(decorationIdsRef.current, []);
      }
      setRegionMeta(null);
      return;
    }
    if (!model) {
      return;
    }

    const applyHighlight = () => {
      const fullText = model.getValue();
      const len = fullText.length;
      const plan = getAlertRuleSplitPlan(fullText, conditionRangeOverride);

      const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

      const lineCount = model.getLineCount();
      const endColumn = model.getLineMaxColumn(lineCount);
      const fullRange = new monaco.Range(1, 1, lineCount, endColumn);

      if (plan.kind === 'all-base') {
        newDecorations.push({
          range: fullRange,
          options: {
            className: BASE_CLASS,
            linesDecorationsClassName: BASE_GUTTER_CLASS,
            isWholeLine: true,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        });
        setRegionMeta(setRegionMetaForPlan(model, plan, len, lineCount));
      } else if (plan.kind === 'all-condition') {
        newDecorations.push({
          range: fullRange,
          options: {
            className: CONDITION_CLASS,
            linesDecorationsClassName: CONDITION_GUTTER_CLASS,
            isWholeLine: true,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        });
        setRegionMeta(setRegionMetaForPlan(model, plan, len, lineCount));
      } else if (plan.kind === 'range') {
        const { conditionStart: cs, conditionEnd: ce } = plan;
        pushBaseDecorations(model, newDecorations, 0, cs);
        pushConditionDecorations(model, newDecorations, cs, ce);
        pushBaseDecorations(model, newDecorations, ce, len);
        setRegionMeta(setRegionMetaForPlan(model, plan, len, lineCount));
      } else {
        const splitOffset = plan.conditionStartOffset;
        pushBaseDecorations(model, newDecorations, 0, splitOffset);
        pushConditionDecorations(model, newDecorations, splitOffset, len);
        setRegionMeta(setRegionMetaForPlan(model, plan, len, lineCount));
      }

      decorationIdsRef.current = model.deltaDecorations(decorationIdsRef.current, newDecorations);
    };

    applyHighlight();
    const disposable = model.onDidChangeContent(() => applyHighlight());

    return () => {
      disposable.dispose();
      decorationIdsRef.current = model.deltaDecorations(decorationIdsRef.current, []);
      setRegionMeta(null);
    };
  }, [active, editorModel, queryText, conditionRangeOverride]);

  return { alertRuleContextHighlightStyle, regionMeta };
}
