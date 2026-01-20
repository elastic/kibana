/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { euiShadow } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';
import type { MapCache } from 'lodash';
import { useRef } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import type { MonacoMessage } from '@kbn/monaco/src/languages/esql/language';
import {
  EDITOR_MAX_HEIGHT,
  EDITOR_MIN_HEIGHT,
  RESIZABLE_CONTAINER_INITIAL_HEIGHT,
} from './esql_editor.styles';

const KEYCODE_ARROW_UP = 38;
const KEYCODE_ARROW_DOWN = 40;

export const useDebounceWithOptions = (
  fn: Function,
  { skipFirstRender }: { skipFirstRender: boolean } = { skipFirstRender: false },
  ms?: number | undefined,
  deps?: React.DependencyList | undefined
) => {
  const isFirstRender = useRef(true);
  const newDeps = [...(deps || []), isFirstRender];

  return useDebounce(
    () => {
      if (skipFirstRender && isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
      return fn();
    },
    ms,
    newDeps
  );
};

/**
 * Quotes can be used as separators for multiple warnings unless
 * they are escaped with backslashes. This regexp will match any
 * quoted string that is not escaped.
 *
 * The warning comes from ES and a user can't change it.
 * This function is used to parse the warning message and format it
 * so it can be displayed in the editor.
 **/
const quotedWarningMessageRegexp = /"([^"\\]|\\.)*"/g;
const maxWarningLength = 1000;

export const parseWarning = (warning: string): MonacoMessage[] => {
  // we limit the length to reduce ReDoS risks
  const truncatedWarning = warning.substring(0, maxWarningLength);
  if (quotedWarningMessageRegexp.test(truncatedWarning)) {
    const matches = truncatedWarning.match(quotedWarningMessageRegexp);
    if (matches) {
      return matches.map((message) => {
        // replaces the quotes only if they are not escaped,
        let warningMessage = message.replace(/(?<!\\)"|\\/g, '');
        let startColumn = 1;
        let startLineNumber = 1;
        // initialize the length to 10 in case no error word found
        let errorLength = 10;
        // if there's line number encoded in the message use it as new positioning
        // and replace the actual message without it
        if (/Line (\d+):(\d+):/.test(warningMessage)) {
          const [encodedLine, encodedColumn, innerMessage, additionalInfoMessage] =
            warningMessage.split(':');
          // sometimes the warning comes to the format java.lang.IllegalArgumentException: warning message
          warningMessage = additionalInfoMessage ?? innerMessage;
          if (!Number.isNaN(Number(encodedColumn))) {
            startColumn = Number(encodedColumn);
            startLineNumber = Number(encodedLine.replace('Line ', ''));
          }
          const openingSquareBracketIndex = warningMessage.indexOf('[');
          if (openingSquareBracketIndex !== -1) {
            const closingSquareBracketIndex = warningMessage.indexOf(
              ']',
              openingSquareBracketIndex
            );
            if (closingSquareBracketIndex !== -1) {
              errorLength = warningMessage.length - openingSquareBracketIndex - 1;
            }
          }
        }

        return {
          message: warningMessage.trimStart(),
          startColumn,
          startLineNumber,
          endColumn: startColumn + errorLength - 1,
          endLineNumber: startLineNumber,
          severity: monaco.MarkerSeverity.Warning,
          code: 'warningFromES',
        };
      });
    }
  }
  // unknown warning message
  return [
    {
      message: warning,
      startColumn: 1,
      startLineNumber: 1,
      endColumn: 10,
      endLineNumber: 1,
      severity: monaco.MarkerSeverity.Warning,
      code: 'unknown',
    },
  ];
};

export const parseErrors = (errors: Error[], code: string): MonacoMessage[] => {
  return errors.map((error) => {
    try {
      if (
        // Found while testing random commands (as inlinestats)
        !error.message.includes('esql_illegal_argument_exception') &&
        error.message.includes('line')
      ) {
        const text = error.message.split('line')[1];
        const [lineNumber, startPosition, errorMessage] = text.split(':');
        // initialize the length to 10 in case no error word found
        let errorLength = 10;
        const [_, wordWithError] = errorMessage.split('[');
        if (wordWithError) {
          errorLength = wordWithError.length - 1;
        }
        return {
          message: errorMessage,
          startColumn: Number(startPosition),
          startLineNumber: Number(lineNumber),
          endColumn: Number(startPosition) + errorLength + 1,
          endLineNumber: Number(lineNumber),
          severity: monaco.MarkerSeverity.Error,
          code: 'errorFromES',
        };
      } else if (error.message.includes('expression was aborted')) {
        return {
          message: i18n.translate('esqlEditor.query.aborted', {
            defaultMessage: 'Request was aborted',
          }),
          startColumn: 1,
          startLineNumber: 1,
          endColumn: 10,
          endLineNumber: 1,
          severity: monaco.MarkerSeverity.Warning,
          code: 'abortedRequest',
        };
      } else {
        // unknown error message
        return {
          message: error.message,
          startColumn: 1,
          startLineNumber: 1,
          endColumn: 10,
          endLineNumber: 1,
          severity: monaco.MarkerSeverity.Error,
          code: 'unknownError',
        };
      }
    } catch (e) {
      return {
        message: error.message,
        startColumn: 1,
        startLineNumber: 1,
        endColumn: 10,
        endLineNumber: 1,
        severity: monaco.MarkerSeverity.Error,
        code: 'unknownError',
      };
    }
  });
};

// refresh the esql cache entry after 10 minutes
const CACHE_INVALIDATE_DELAY = 10 * 60 * 1000;

export const clearCacheWhenOld = (cache: MapCache, esqlQuery: string) => {
  if (cache.has(esqlQuery)) {
    const cacheEntry = cache.get(esqlQuery);
    if (Date.now() - cacheEntry.timestamp > CACHE_INVALIDATE_DELAY) {
      cache.delete(esqlQuery);
    }
  }
};

export const onMouseDownResizeHandler = (
  mouseDownEvent: React.MouseEvent<HTMLButtonElement, MouseEvent> | React.TouchEvent,
  height: number,
  setHeight: (height: number) => void,
  secondPanelHeight?: number,
  setSecondPanelHeight?: (height: number) => void
) => {
  function isMouseEvent(e: React.TouchEvent | React.MouseEvent): e is React.MouseEvent {
    return e && 'pageY' in e;
  }

  const startSize = height;
  const startPosition = isMouseEvent(mouseDownEvent)
    ? mouseDownEvent?.pageY
    : mouseDownEvent?.touches[0].pageY;

  function onMouseMove(mouseMoveEvent: MouseEvent) {
    const h = startSize - startPosition + mouseMoveEvent.pageY;
    const firstPanelHeightValidated = Math.min(Math.max(h, EDITOR_MIN_HEIGHT), EDITOR_MAX_HEIGHT);
    setHeight(firstPanelHeightValidated);
    if (setSecondPanelHeight && secondPanelHeight) {
      const maxHeight = height + secondPanelHeight;
      const secondPanelHeightValidated = Math.min(
        Math.max(maxHeight - firstPanelHeightValidated, RESIZABLE_CONTAINER_INITIAL_HEIGHT),
        maxHeight
      );
      setSecondPanelHeight?.(secondPanelHeightValidated);
    }
  }
  function onMouseUp() {
    document.body.removeEventListener('mousemove', onMouseMove);
  }

  document.body.addEventListener('mousemove', onMouseMove);
  document.body.addEventListener('mouseup', onMouseUp, { once: true });
};

export const onKeyDownResizeHandler = (
  keyDownEvent: React.KeyboardEvent,
  height: number,
  setHeight: (height: number) => void,
  secondPanelHeight?: number,
  setSecondPanelHeight?: (height: number) => void
) => {
  let h = height;
  if (keyDownEvent.keyCode === KEYCODE_ARROW_UP || keyDownEvent.keyCode === KEYCODE_ARROW_DOWN) {
    const step = keyDownEvent.keyCode === KEYCODE_ARROW_UP ? -10 : 10;
    h = h + step;
    const firstPanelHeightValidated = Math.min(Math.max(h, EDITOR_MIN_HEIGHT), EDITOR_MAX_HEIGHT);
    setHeight(firstPanelHeightValidated);
    if (setSecondPanelHeight && secondPanelHeight) {
      const maxHeight = height + secondPanelHeight;
      const secondPanelHeightValidated = Math.min(
        Math.max(maxHeight - firstPanelHeightValidated, RESIZABLE_CONTAINER_INITIAL_HEIGHT),
        maxHeight
      );
      setSecondPanelHeight?.(secondPanelHeightValidated);
    }
  }
};

export const getEditorOverwrites = (theme: UseEuiTheme<{}>) => {
  return css`
    .monaco-editor .suggest-details .scrollbar {
      display: none !important;
    }

    .monaco-hover {
      display: block !important;
      background-color: ${theme.euiTheme.colors.backgroundBasePlain} !important;
      line-height: 1.5rem;
      border-radius: ${theme.euiTheme.border.radius.medium} !important;
      box-shadow: ${theme.euiTheme.shadows.l.down} !important;
    }

    // Fixes inline suggestions hover styles and only
    .monaco-hover:has(.inlineSuggestionsHints) {
      height: auto !important;
      width: auto !important;
      overflow-y: hidden !important;
      a {
        color: ${theme.euiTheme.colors.textParagraph} !important;
      }
      .inlineSuggestionStatusBarItemLabel {
        font-size: 10px !important;
        display: flex;
        align-items: center;
        color: ${theme.euiTheme.colors.textParagraph} !important;
      }
      .slider {
        display: none;
      }
      .keybinding {
        opacity: 1 !important;
      }
      .monaco-keybinding-key {
        background-color: ${theme.euiTheme.colors.backgroundBaseSubdued} !important;
        box-shadow: none !important;
        border: 1px solid ${theme.euiTheme.colors.borderBasePlain} !important;
      }
      .codicon-toolbar-more {
        opacity: 0 !important;
      }
      .codicon-inline-suggestion-hints-next {
        margin-right: ${theme.euiTheme.size.xs} !important;
      }
      .codicon-inline-suggestion-hints-previous,
      .codicon-inline-suggestion-hints-next {
        color: ${theme.euiTheme.colors.textParagraph} !important;
      }
    }
    .hover-row.status-bar {
      display: none;
    }
    .margin-view-overlays .line-numbers {
      color: ${theme.euiTheme.colors.textDisabled};
    }
    .current-line ~ .line-numbers {
      color: ${theme.euiTheme.colors.textSubdued};
    }

    .suggest-widget,
    .suggest-details-container {
      border-radius: ${theme.euiTheme.border.radius.medium};
      ${euiShadow(theme, 'l')}
      // Suggestions must be rendered above flyouts
      z-index: 1100 !important;
    }

    .suggest-details-container {
      background-color: ${theme.euiTheme.colors.backgroundBasePlain};
      line-height: 1.5rem;
    }

    .suggest-details {
      padding-left: ${theme.euiTheme.size.m};
      padding-right: ${theme.euiTheme.size.m};
      text-align: justify;
    }

    .monaco-list .monaco-scrollable-element .monaco-list-row.focused {
      border-radius: ${theme.euiTheme.border.radius.medium};
    }
    // fixes the bug with the broken suggestion details https://github.com/elastic/kibana/issues/217998
    .suggest-details > .monaco-scrollable-element > .body > .header > .type {
      white-space: normal !important;
    }

    .suggest-details .rendered-markdown h1 {
      display: block;
      margin-top: ${theme.euiTheme.size.m};
      font-size: ${theme.euiTheme.size.base};
      font-weight: ${theme.euiTheme.font.weight.bold};
    }

    .suggest-details [data-code] {
      overflow-x: auto !important;
    }
  `;
};

export const filterDataErrors = (errors: (MonacoMessage & { code: string })[]): MonacoMessage[] => {
  return errors.filter((error) => {
    return !['unknownIndex', 'unknownColumn', 'unmappedColumnWarning'].includes(error.code);
  });
};

/**
 * Filters warning messages that overlap with error messages ranges.
 */
export const filterOutWarningsOverlappingWithErrors = (
  errors: MonacoMessage[],
  warnings: MonacoMessage[]
): MonacoMessage[] => {
  const hasOverlap = (warning: MonacoMessage) => {
    return errors.some((error) => {
      const isOverlappingLine =
        warning.startLineNumber <= error.endLineNumber &&
        warning.endLineNumber >= error.startLineNumber;
      const isOverlappingColumn =
        warning.startColumn <= error.endColumn && warning.endColumn >= error.startColumn;

      return isOverlappingLine && isOverlappingColumn;
    });
  };

  return warnings.filter((warning) => !hasOverlap(warning));
};
