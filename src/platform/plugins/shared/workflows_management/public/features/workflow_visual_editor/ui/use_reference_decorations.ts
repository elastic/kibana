/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { shade, tint } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import type { CSSObject } from '@emotion/react';
import { useEffect, useRef, useState } from 'react';
import { monaco } from '@kbn/code-editor';
import { loadTypeIconMasks } from '@kbn/workflows-ui';
import { getReferenceChipColors } from '../lib/reference_chip_styles';
import type { ReferenceChipTone } from '../lib/reference_chip_styles';
import type { ReferenceToken } from '../lib/reference_tokens';

type Editor = monaco.editor.IStandaloneCodeEditor;

const CHIP = 'workflowRefChip';
/** Two non-breaking spaces: the icon's slot, measured by Monaco like any other text. */
const ICON_SLOT = '\u00a0\u00a0';

const classNamesFor = (token: ReferenceToken, part: 'start' | 'mid' | 'end'): string =>
  [CHIP, `${CHIP}--${part}`, `${CHIP}--${token.tone}`].join(' ');

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
 * One chip is an icon plus three adjacent decorations (opening delimiter, expression, closing
 * delimiter). Monaco splits a line into one span per decoration boundary, so a single class on
 * an overlapping range would repeat the box edges on every fragment.
 *
 * The chip must not change how wide the text is: Monaco wraps lines by measuring characters and
 * knows nothing about CSS padding or borders. So the box is drawn with inset shadows, and the
 * icon is *injected text* (a real two-character slot Monaco lays out and wraps around) that
 * the caret skips, with the glyph painted inside it.
 */
const buildDecorations = (
  model: monaco.editor.ITextModel,
  tokens: readonly ReferenceToken[]
): monaco.editor.IModelDeltaDecoration[] =>
  tokens.flatMap((token) => {
    const openEnd = token.start + token.openLength;
    const closeStart = token.end - 2;
    const part = (kind: 'start' | 'mid' | 'end') => ({
      inlineClassName: classNamesFor(token, kind),
      ...(kind === 'mid' ? { hoverMessage: { value: token.hover } } : {}),
    });
    return [
      {
        range: rangeOf(model, token.start, token.start),
        options: {
          // Monaco drops injected text on an empty range unless it is told to show it.
          showIfCollapsed: true,
          before: {
            content: ICON_SLOT,
            inlineClassName: [
              `${CHIP}Icon`,
              `${CHIP}Icon--${token.tone}`,
              `${CHIP}Icon--${token.iconType}`,
            ].join(' '),
            cursorStops: monaco.editor.InjectedTextCursorStops.None,
          },
        },
      },
      { range: rangeOf(model, token.start, openEnd), options: part('start') },
      { range: rangeOf(model, openEnd, closeStart), options: part('mid') },
      { range: rangeOf(model, closeStart, token.end), options: part('end') },
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
 * decorations as descendants. Nothing here may change a character's width (see
 * `buildDecorations`): edges are inset shadows, and the icon lives in injected text.
 */
export const getReferenceChipEditorCss = (
  euiTheme: UseEuiTheme['euiTheme'],
  masks: Readonly<Record<string, string>>,
  colorMode: UseEuiTheme['colorMode']
): CSSObject => {
  const radius = euiTheme.border.radius.small;
  // The type icon's tile, built the way `EuiToken` builds its gray tile (what `FieldIcon`
  // draws in the read view): the glyph in `darkShade`, on a faint tint of it with a thin ring.
  const isDark = colorMode === 'DARK';
  const glyphColor = euiTheme.colors.darkShade;
  const tile = {
    background: isDark ? shade(glyphColor, 0.9) : tint(glyphColor, 0.9),
    ring: isDark ? shade(glyphColor, 0.6) : tint(glyphColor, 0.2),
  };
  // One character cell is `1ch`, so the tile fills the two-character slot without widening it.
  const tileSize = 'calc(2ch - 2px)';
  const edge = (color: string, sides: readonly ('left' | 'right' | 'top' | 'bottom')[]) =>
    sides
      .map((side) => {
        const x = side === 'left' ? 1 : side === 'right' ? -1 : 0;
        const y = side === 'top' ? 1 : side === 'bottom' ? -1 : 0;
        return `inset ${x}px ${y}px 0 0 ${color}`;
      })
      .join(', ');
  const toneRules = TONES.map((tone) => {
    const colors = getReferenceChipColors(euiTheme, tone);
    return {
      [`.${CHIP}--${tone}`]: { backgroundColor: colors.background, color: colors.text },
      [`.${CHIP}--${tone}.${CHIP}--start`]: {
        boxShadow: edge(colors.border, ['top', 'bottom']),
      },
      [`.${CHIP}--${tone}.${CHIP}--mid`]: {
        boxShadow: edge(colors.border, ['top', 'bottom']),
      },
      [`.${CHIP}--${tone}.${CHIP}--end`]: {
        boxShadow: edge(colors.border, ['top', 'bottom', 'right']),
        borderStartEndRadius: radius,
        borderEndEndRadius: radius,
      },
      [`.${CHIP}Icon--${tone}`]: {
        backgroundColor: colors.background,
        boxShadow: edge(colors.border, ['top', 'bottom', 'left']),
        borderStartStartRadius: radius,
        borderEndStartRadius: radius,
      },
    };
  }).reduce((all, rules) => ({ ...all, ...rules }), {});
  const iconRules = Object.fromEntries(
    Object.entries(masks).map(([type, url]) => [
      `.${CHIP}Icon--${type}::after`,
      { maskImage: `url("${url}")`, WebkitMaskImage: `url("${url}")` },
    ])
  );
  return {
    ...toneRules,
    // Delimiters read as punctuation; the expression keeps the full text colour.
    [`.${CHIP}--start, .${CHIP}--end`]: { color: euiTheme.colors.textSubdued },
    // The injected slot paints the icon tile (::before) and the type glyph on it (::after),
    // centred, without taking extra width.
    [`.${CHIP}Icon`]: { position: 'relative' },
    [`.${CHIP}Icon::before, .${CHIP}Icon::after`]: {
      content: '""',
      position: 'absolute',
      inset: 0,
      margin: 'auto',
      width: tileSize,
      height: tileSize,
    },
    [`.${CHIP}Icon::before`]: {
      backgroundColor: tile.background,
      boxShadow: `inset 0 0 0 ${euiTheme.border.width.thin} ${tile.ring}`,
      borderRadius: euiTheme.border.radius.inline,
    },
    [`.${CHIP}Icon::after`]: {
      backgroundColor: glyphColor,
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
