/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  monaco,
  type CodeEditorScope,
  type KbnCodeEditorChromeOverrides,
  type MonacoMessage,
} from '@kbn/code-editor';
import { uniqBy, type MapCache } from 'lodash';
import { useRef } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
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
  const newDeps = deps || [];

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
        const [encodedLine, encodedColumn, innerMessage, ...additionalParts] =
          warningMessage.split(':');
        const additionalInfoMessage =
          additionalParts.length > 0 ? additionalParts.join(':') : undefined;
        // sometimes the warning comes to the format java.lang.IllegalArgumentException: warning message
        warningMessage = additionalInfoMessage ?? innerMessage;
        if (!Number.isNaN(Number(encodedColumn))) {
          startColumn = Number(encodedColumn);
          startLineNumber = Number(encodedLine.replace('Line ', ''));
        }
        const openingSquareBracketIndex = warningMessage.indexOf('[');
        if (openingSquareBracketIndex !== -1) {
          const closingSquareBracketIndex = warningMessage.indexOf(']', openingSquareBracketIndex);
          if (closingSquareBracketIndex !== -1) {
            errorLength = closingSquareBracketIndex - openingSquareBracketIndex - 1;
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

const ES_PROBLEM_MARKER_REGEX = /line (\d+):(\d+):/g;

export const parseErrors = (errors: Error[], code: string): MonacoMessage[] => {
  return errors.flatMap((error): MonacoMessage[] => {
    const errorMessage = typeof error.message === 'string' ? error.message : String(error.message);
    try {
      if (
        // Found while testing random commands (as inlinestats)
        !errorMessage.includes('esql_illegal_argument_exception') &&
        errorMessage.includes('line')
      ) {
        const markers: Array<{ line: number; column: number; end: number; start: number }> = [];
        for (const match of errorMessage.matchAll(ES_PROBLEM_MARKER_REGEX)) {
          markers.push({
            line: Number(match[1]),
            column: Number(match[2]),
            start: match.index ?? 0,
            end: (match.index ?? 0) + match[0].length,
          });
        }

        if (markers.length > 0) {
          return markers.map((marker, i) => {
            const messageEnd = i + 1 < markers.length ? markers[i + 1].start : errorMessage.length;
            const message = errorMessage.slice(marker.end, messageEnd).replace(/\s+$/, '');
            const bracketed = message.match(/\[([^\]]*)\]/);
            const errorLength = bracketed ? bracketed[1].length : 10;
            return {
              message,
              startColumn: marker.column,
              startLineNumber: marker.line,
              endColumn: marker.column + errorLength + 1,
              endLineNumber: marker.line,
              severity: monaco.MarkerSeverity.Error,
              code: 'errorFromES',
            };
          });
        }
      }

      if (errorMessage.includes('expression was aborted')) {
        return [
          {
            message: i18n.translate('esqlEditor.query.aborted', {
              defaultMessage: 'Request was aborted',
            }),
            startColumn: 1,
            startLineNumber: 1,
            endColumn: 10,
            endLineNumber: 1,
            severity: monaco.MarkerSeverity.Warning,
            code: 'abortedRequest',
          },
        ];
      }

      return [
        {
          message: errorMessage,
          startColumn: 1,
          startLineNumber: 1,
          endColumn: 10,
          endLineNumber: 1,
          severity: monaco.MarkerSeverity.Error,
          code: 'unknownError',
        },
      ];
    } catch (e) {
      return [
        {
          message: errorMessage,
          startColumn: 1,
          startLineNumber: 1,
          endColumn: 10,
          endLineNumber: 1,
          severity: monaco.MarkerSeverity.Error,
          code: 'unknownError',
        },
      ];
    }
  });
};

// refresh the esql cache entry after 10 minutes
export const CACHE_INVALIDATE_DELAY = 10 * 60 * 1000;
export const DATA_SOURCES_CACHE_KEY = 'dataSources';
export const HISTORY_STARRED_ITEMS_CACHE_KEY = 'historyStarredItems';
export const JOIN_INDICES_CACHE_KEY = 'joinIndices';
export const TIMESERIES_INDICES_CACHE_KEY = 'timeseriesIndices';

export const clearCacheWhenOld = (cache: MapCache, key: string) => {
  if (cache.has(key)) {
    const cacheEntry = cache.get(key);
    if (Date.now() - cacheEntry.timestamp > CACHE_INVALIDATE_DELAY) {
      cache.delete(key);
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
  document.body.addEventListener('touchend', onMouseUp, { once: true });
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

/**
 * The ES|QL editor's chrome: colors Monaco reads from its `--vscode-*` custom properties, applied
 * to this editor's own nodes only (see `CodeEditor`'s `chromeOverrides`). Syntax highlighting is a
 * separate layer — the ES|QL language theme — and is not affected by anything here. The full list
 * of properties is at
 * https://github.com/microsoft/vscode/blob/main/build/lib/stylelint/vscode-known-variables.json.
 */
export const esqlEditorChromeOverrides: KbnCodeEditorChromeOverrides = ({ euiTheme }) => {
  const { colors } = euiTheme;

  const borderColor = colors.lightestShade || colors.borderBasePlain;
  const bgColor = colors.emptyShade || colors.backgroundBasePlain;
  // EUI types these as `string | number | undefined`; an undefined entry is dropped.
  const cssValue = (value: string | number | undefined) =>
    value === undefined ? undefined : String(value);

  return {
    '--vscode-cornerRadius-large': cssValue(euiTheme.border.radius.inline),
    '--vscode-shadow-lg': cssValue(euiTheme.shadows.l.down),
    '--vscode-editor-foreground': colors.textParagraph,
    '--vscode-editor-background': bgColor,
    '--vscode-editor-selectionHighlightBackground': borderColor,
    '--vscode-editor-selectionHighlightBorder': borderColor,
    '--vscode-editorLineNumber-foreground': colors.textDisabled,
    '--vscode-editorLineNumber-activeForeground': colors.textSubdued,
    '--vscode-editorHoverWidget-background': bgColor,
    '--vscode-editorSuggestWidget-foreground': colors.textParagraph,
    '--vscode-editorSuggestWidget-focusHighlightForeground': bgColor,
    '--vscode-editorSuggestWidget-highlightForeground': colors.primary,
    '--vscode-editorSuggestWidget-selectedBackground': colors.primary,
    '--vscode-editorSuggestWidget-selectedForeground': bgColor,
  };
};

/**
 * The ES|QL editor's structural styles: things Monaco exposes no colour property for (hiding,
 * z-index, spacing, radius on widgets). Every selector starts from the scope `CodeEditor` hands
 * over, so the rules reach this editor's inline nodes and its portaled widgets, and nothing else.
 */
export const getEditorScopedStyles = (theme: UseEuiTheme<{}>, scope: CodeEditorScope) => {
  const { colors } = theme.euiTheme;

  return css`
    // Monaco paints the current line from a rule it generates with the colour already resolved,
    // so the lineHighlight CSS variables never reach it and chromeOverrides cannot set them.
    // These rules are scoped to this editor and more specific than the ones Monaco generates.
    ${scope.editor} .monaco-editor.focused .view-overlays .current-line {
      background-color: ${colors.lightestShade || colors.borderBasePlain};
    }

    ${scope.editor} .monaco-editor .view-overlays .current-line-exact {
      border-color: ${colors.lightestShade || colors.borderBasePlain};
    }

    ${scope.overflowWidgets} .suggest-details .scrollbar {
      display: none;
    }

    ${scope.editor} .monaco-hover,
    ${scope.overflowWidgets} .monaco-hover {
      line-height: 1.5rem;
      border-radius: ${theme.euiTheme.border.radius.medium};
      box-shadow: ${theme.euiTheme.shadows.l.down};
      z-index: ${theme.euiTheme.levels.flyout};
    }

    // Fixes inline suggestions hover styles and only
    ${scope.editor} .monaco-hover:has(.inlineSuggestionsHints),
    ${scope.overflowWidgets} .monaco-hover:has(.inlineSuggestionsHints) {
      height: auto;
      width: auto;
      overflow-y: hidden;
      a {
        color: ${theme.euiTheme.colors.textParagraph};
      }
      .inlineSuggestionStatusBarItemLabel {
        font-size: 10px;
        display: flex;
        align-items: center;
        color: ${theme.euiTheme.colors.textParagraph};
      }
      .slider {
        display: none;
      }
      .keybinding {
        opacity: 1;
      }
      .monaco-keybinding-key {
        background-color: ${theme.euiTheme.colors.backgroundBaseSubdued};
        box-shadow: none;
        border: 1px solid ${theme.euiTheme.colors.borderBasePlain};
      }
      .codicon-toolbar-more {
        opacity: 0;
      }
      .codicon-inline-suggestion-hints-next {
        margin-right: ${theme.euiTheme.size.xs};
      }
      .codicon-inline-suggestion-hints-previous,
      .codicon-inline-suggestion-hints-next {
        color: ${theme.euiTheme.colors.textParagraph};
      }
    }

    /* Hide View Problem action, it's always the first action */
    ${scope.editor} .monaco-hover .hover-row.status-bar .actions > .action-container:nth-of-type(1),
    ${scope.overflowWidgets} .monaco-hover .hover-row.status-bar .actions > .action-container:nth-of-type(1) {
      display: none;
    }

    ${scope.editor} .action-widget,
    ${scope.overflowWidgets} .action-widget {
      min-width: calc(${theme.euiTheme.size.xl} * 6);
    }

    ${scope.overflowWidgets} .suggest-widget,
    ${scope.overflowWidgets} .suggest-details-container {
      // Suggestions must be rendered above flyouts
      z-index: ${theme.euiTheme.levels.toast};
    }

    ${scope.overflowWidgets} .suggest-widget.message {
      display: none;
    }

    ${scope.overflowWidgets} .suggest-details-container {
      background-color: ${theme.euiTheme.colors.backgroundBasePlain};
      line-height: 1.5rem;
      border-radius: ${theme.euiTheme.border.radius.inline};
      box-shadow: ${theme.euiTheme.shadows.l.down};
    }

    ${scope.overflowWidgets} .suggest-details {
      padding-left: ${theme.euiTheme.size.m};
      padding-right: ${theme.euiTheme.size.m};
      text-align: justify;
    }

    ${scope.overflowWidgets} .monaco-list .monaco-scrollable-element .monaco-list-row.focused {
      border-radius: ${theme.euiTheme.border.radius.medium};
    }

    // fixes the bug with the broken suggestion details https://github.com/elastic/kibana/issues/217998
    ${scope.overflowWidgets} .suggest-details > .monaco-scrollable-element > .body > .header > .type {
      white-space: normal;
    }

    ${scope.overflowWidgets} .suggest-details .rendered-markdown h1 {
      display: block;
      margin-top: ${theme.euiTheme.size.m};
      font-size: ${theme.euiTheme.size.base};
      font-weight: ${theme.euiTheme.font.weight.bold};
    }

    ${scope.overflowWidgets} .suggest-details [data-code] {
      overflow-x: auto;
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

export const filterDuplicatedWarnings = (
  warnings: (MonacoMessage & { code: string })[]
): MonacoMessage[] => {
  return uniqBy(warnings, (warning) => {
    return warning.message;
  });
};

/**
 * Computes toggled comment lines for a set of lines, following standard IDE behavior:
 * comment all lines if any line is uncommented, uncomment all only if every line
 * is already commented.
 */
export const getToggleCommentLines = (lines: string[]): string[] => {
  const allCommented = lines.every((line) => line.startsWith('//'));
  const shouldComment = !allCommented;

  return lines.map((line) => {
    const isCommented = line.startsWith('//');
    if (shouldComment && !isCommented) {
      return `//${line}`;
    }
    if (!shouldComment && isCommented) {
      return line.replace('//', '');
    }
    return line;
  });
};

/**
 * Keeps suggestions alive when the text before the cursor ends with:
 * - a token character (`[\w`]`)
 * - a space
 * - `::`
 * - `.`
 */
export const shouldAutoTriggerSuggestions = (lineContentBeforeCursor: string): boolean => {
  const lastCharacter = lineContentBeforeCursor.at(-1);
  const spaceHasBeenTyped = lineContentBeforeCursor.endsWith(' ');
  const inlineCastHasBeenTyped = lineContentBeforeCursor.endsWith('::');
  const dotHasBeenTyped = lineContentBeforeCursor.endsWith('.');
  const currentTokenHasBeenTyped = Boolean(lastCharacter && /[\w`]/.test(lastCharacter));

  return spaceHasBeenTyped || inlineCastHasBeenTyped || dotHasBeenTyped || currentTokenHasBeenTyped;
};

/**
 * Tracks the Monaco suggest-widget visibility so the editor can avoid
 * re-triggering autocomplete while the popup is already open.
 */
export const trackSuggestionPopupState = (
  editor: monaco.editor.IStandaloneCodeEditor,
  isSuggestionPopupOpenRef: React.MutableRefObject<boolean>
): monaco.IDisposable => {
  const suggestionController = editor.getContribution('editor.contrib.suggestController');
  const suggestionWidget = suggestionController?.widget?.value;

  const disposables: monaco.IDisposable[] = [];
  if (suggestionWidget?.onDidShow && suggestionWidget?.onDidHide) {
    disposables.push(
      suggestionWidget.onDidShow(() => {
        isSuggestionPopupOpenRef.current = true;
      })
    );
    disposables.push(
      suggestionWidget.onDidHide(() => {
        isSuggestionPopupOpenRef.current = false;
      })
    );
  }
  return { dispose: () => disposables.forEach((d) => d.dispose()) };
};

/**
 * Checks if the code actions menu is being displayed.
 * @param editor
 * @returns
 */
export const isCodeActionMenuVisible = (editor: monaco.editor.IStandaloneCodeEditor): boolean => {
  const actionWidgetList = editor.getDomNode()?.querySelector('.action-widget .actionList');
  if (actionWidgetList) {
    return Array.from(actionWidgetList.children).length > 0;
  }
  return false;
};
