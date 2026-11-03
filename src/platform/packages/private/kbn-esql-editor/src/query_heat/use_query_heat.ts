/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo } from 'react';
import type { MutableRefObject } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { monaco } from '@kbn/code-editor';
import {
  buildHeatDecorations,
  findHeatCommandAtLine,
  HEAT_BADGE_CLASS,
  HEAT_STRIPE_CLASS,
  matchHeatToText,
  SPEED_UP_COMMAND_ID,
} from './query_heat';
import type { EditorCommandHeat, EditorCommandHeatEntry } from './query_heat';

type SpeedUpHandler = (commandIndex: number) => void;

const speedUpHandlers = new Map<string, SpeedUpHandler>();
let isCommandRegistered = false;

/** The link in the hover runs a Monaco command, which finds the editor it belongs to by its model. */
function ensureSpeedUpCommandRegistered() {
  if (isCommandRegistered) {
    return;
  }
  isCommandRegistered = true;
  monaco.editor.registerCommand(
    SPEED_UP_COMMAND_ID,
    (_accessor: unknown, commandIndex: number, modelUri: string) => {
      speedUpHandlers.get(modelUri)?.(commandIndex);
    }
  );
}

const speedUpCommandUri = (commandIndex: number, modelUri: string): string =>
  `command:${SPEED_UP_COMMAND_ID}?${encodeURIComponent(JSON.stringify([commandIndex, modelUri]))}`;

/** Styles for the gutter stripe and the share at the end of a command. */
export const useQueryHeatStyle = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const levels = {
      hot: {
        stripe: euiTheme.colors.danger,
        text: euiTheme.colors.textDanger,
        background: euiTheme.colors.backgroundLightDanger,
      },
      warm: {
        stripe: euiTheme.colors.warning,
        text: euiTheme.colors.textWarning,
        background: euiTheme.colors.backgroundLightWarning,
      },
      cool: {
        stripe: euiTheme.colors.primary,
        text: euiTheme.colors.textPrimary,
        background: euiTheme.colors.backgroundLightPrimary,
      },
    };

    return css`
      .${HEAT_STRIPE_CLASS} {
        cursor: pointer;
      }
      .${HEAT_BADGE_CLASS} {
        cursor: help;
        margin-inline-start: ${euiTheme.size.m};
        padding: 0 ${euiTheme.size.xs};
        border-radius: ${euiTheme.border.radius.small};
        font-size: ${euiTheme.font.scale.xs * euiTheme.base}px;
        font-weight: ${euiTheme.font.weight.bold};
        font-style: normal;
      }
      ${Object.entries(levels).map(
        ([level, color]) => css`
          .${HEAT_STRIPE_CLASS}--${level} {
            background: linear-gradient(
              to right,
              transparent 6px,
              ${color.stripe} 6px,
              ${color.stripe} 10px,
              transparent 10px
            );
          }
          .${HEAT_BADGE_CLASS}--${level} {
            color: ${color.text};
            background-color: ${color.background};
          }
        `
      )}
    `;
  }, [euiTheme]);
};

interface UseQueryHeatParams {
  editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
  editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
  isEditorReady: boolean;
  heat?: EditorCommandHeat;
  /** Offers to speed a command up, from its hover and from a click on its gutter stripe. */
  onSpeedUpCommand?: SpeedUpHandler;
}

/**
 * Shows where a query spent its time next to its commands. The heat only describes the text it was
 * measured on, so it disappears as soon as the query is edited.
 */
export const useQueryHeat = ({
  editorRef,
  editorModel,
  isEditorReady,
  heat,
  onSpeedUpCommand,
}: UseQueryHeatParams) => {
  useEffect(() => {
    const editor = editorRef.current;
    const model = editorModel.current;
    if (!isEditorReady || !editor || !model || !heat) {
      return;
    }

    const modelUri = model.uri.toString();
    const collection = editor.createDecorationsCollection([]);
    let matched: EditorCommandHeatEntry[] | undefined;
    const positionAt = (offset: number) => model.getPositionAt(offset);

    const refresh = () => {
      matched = matchHeatToText(heat, model.getValue());
      collection.set(
        matched
          ? buildHeatDecorations({
              entries: matched,
              text: model.getValue(),
              positionAt,
              getLineMaxColumn: (lineNumber) => model.getLineMaxColumn(lineNumber),
              speedUpCommandUri: onSpeedUpCommand
                ? (index) => speedUpCommandUri(index, modelUri)
                : undefined,
            })
          : []
      );
    };
    refresh();

    if (onSpeedUpCommand) {
      ensureSpeedUpCommandRegistered();
      speedUpHandlers.set(modelUri, onSpeedUpCommand);
    }

    const contentDisposable = editor.onDidChangeModelContent(refresh);
    const mouseDisposable = editor.onMouseDown((event) => {
      const lineNumber = event.target.position?.lineNumber;
      if (
        !onSpeedUpCommand ||
        !matched ||
        lineNumber === undefined ||
        event.target.type !== monaco.editor.MouseTargetType.GUTTER_LINE_DECORATIONS
      ) {
        return;
      }
      const index = findHeatCommandAtLine(matched, lineNumber, positionAt);
      if (index !== undefined) {
        onSpeedUpCommand(index);
      }
    });

    return () => {
      contentDisposable.dispose();
      mouseDisposable.dispose();
      collection.clear();
      if (speedUpHandlers.get(modelUri) === onSpeedUpCommand) {
        speedUpHandlers.delete(modelUri);
      }
    };
  }, [editorRef, editorModel, isEditorReady, heat, onSpeedUpCommand]);
};
