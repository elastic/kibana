/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { useEffect, useRef, useState } from 'react';
import type { monaco } from '@kbn/code-editor';
import { loadTypeIconMasks } from '@kbn/workflows-ui';
import { getReferenceChipColors } from '../lib/reference_chip_styles';
import type { ReferenceChipTone } from '../lib/reference_chip_styles';
import type { ReferenceToken } from '../lib/reference_tokens';

type Editor = monaco.editor.IStandaloneCodeEditor;

const CHIP = 'workflowRefChip';

const classNamesFor = (token: ReferenceToken, part: 'start' | 'mid' | 'end'): string =>
  [CHIP, `${CHIP}--${part}`, `${CHIP}--${token.tone}`, `${CHIP}--icon-${token.iconType}`].join(' ');

const rangeOf = (model: monaco.editor.ITextModel, from: number, to: number) => {
  const start = model.getPositionAt(from);
  const end = model.getPositionAt(to);
  return {
    startLineNumber: start.lineNumber,
    startColumn: start.column,
    endLineNumber: end.lineNumber,
    endColumn: end.column,
  };
};

/**
 * One chip is three adjacent decorations (opening delimiter, expression, closing delimiter).
 * Monaco splits a line into one span per decoration boundary, so a single class on a
 * overlapping range would repeat the border and the icon on every fragment.
 */
const buildDecorations = (
  model: monaco.editor.ITextModel,
  tokens: readonly ReferenceToken[]
): monaco.editor.IModelDeltaDecoration[] =>
  tokens.flatMap((token) => {
    const openEnd = token.start + token.openLength;
    const closeStart = token.end - 2;
    const options = (part: 'start' | 'mid' | 'end') => ({
      inlineClassName: classNamesFor(token, part),
      // The chip adds padding, a border and an icon: tell Monaco to measure text instead of
      // assuming fixed character widths, or the caret drifts.
      inlineClassNameAffectsLetterSpacing: true,
      ...(part === 'mid' ? { hoverMessage: { value: token.hover } } : {}),
    });
    return [
      { range: rangeOf(model, token.start, openEnd), options: options('start') },
      { range: rangeOf(model, openEnd, closeStart), options: options('mid') },
      { range: rangeOf(model, closeStart, token.end), options: options('end') },
    ];
  });

/** Draws reference chips over the real text of a Monaco editor (ES|QL FROM-badge pattern). */
export const useReferenceDecorations = (
  editor: Editor | null | undefined,
  text: string,
  tokens: readonly ReferenceToken[]
): void => {
  const collectionRef = useRef<monaco.editor.IEditorDecorationsCollection | undefined>(undefined);

  useEffect(() => {
    if (!editor || typeof editor.createDecorationsCollection !== 'function') return;
    const model = editor.getModel();
    // The decoration offsets come from `text`; wait for the model to hold the same value.
    if (!model || model.getValue() !== text) return;
    collectionRef.current?.clear();
    collectionRef.current = editor.createDecorationsCollection(buildDecorations(model, tokens));
    return () => {
      collectionRef.current?.clear();
      collectionRef.current = undefined;
    };
  }, [editor, text, tokens]);
};

/** Type glyph masks, loaded once; empty until the icon chunks resolve. */
export const useReferenceIconMasks = (): Readonly<Record<string, string>> => {
  const [masks, setMasks] = useState<Readonly<Record<string, string>>>({});
  useEffect(() => {
    let isActive = true;
    loadTypeIconMasks().then((loaded) => {
      if (isActive && Object.keys(loaded).length > 0) setMasks(loaded);
    });
    return () => {
      isActive = false;
    };
  }, []);
  return masks;
};

const TONES: readonly ReferenceChipTone[] = ['neutral', 'warning'];

/**
 * Emotion styles for the chip classes above. Apply to an ancestor of the editor; Monaco renders
 * decorations as descendants. Chips keep the page's neutral/amber colours in both themes.
 */
export const getReferenceChipEditorCss = (
  euiTheme: UseEuiTheme['euiTheme'],
  masks: Readonly<Record<string, string>>
) => {
  const radius = euiTheme.border.radius.small;
  const border = euiTheme.border.width.thin;
  const toneRules = Object.fromEntries(
    TONES.map((tone) => {
      const colors = getReferenceChipColors(euiTheme, tone);
      const edge = `${border} solid ${colors.border}`;
      return [
        `.${CHIP}--${tone}`,
        {
          backgroundColor: colors.background,
          color: colors.text,
          borderBlock: edge,
          [`&.${CHIP}--start`]: {
            borderInlineStart: edge,
            borderStartStartRadius: radius,
            borderEndStartRadius: radius,
            paddingInlineStart: euiTheme.size.xs,
          },
          [`&.${CHIP}--end`]: {
            borderInlineEnd: edge,
            borderStartEndRadius: radius,
            borderEndEndRadius: radius,
            paddingInlineEnd: euiTheme.size.xs,
          },
        },
      ];
    })
  );
  const iconRules = Object.fromEntries(
    Object.entries(masks).map(([type, url]) => [
      `.${CHIP}--icon-${type}::before`,
      { maskImage: `url("${url}")`, WebkitMaskImage: `url("${url}")` },
    ])
  );
  return {
    ...toneRules,
    // Delimiters read as punctuation; the expression keeps the full text colour.
    [`.${CHIP}--start, .${CHIP}--end`]: { color: euiTheme.colors.textSubdued },
    [`.${CHIP}--start::before`]: {
      content: '""',
      display: 'inline-block',
      width: euiTheme.size.m,
      height: euiTheme.size.m,
      marginInlineEnd: euiTheme.size.xs,
      verticalAlign: 'text-bottom',
      backgroundColor: 'currentColor',
      maskSize: 'contain',
      maskRepeat: 'no-repeat',
      maskPosition: 'center',
      WebkitMaskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
    },
    ...iconRules,
  };
};
