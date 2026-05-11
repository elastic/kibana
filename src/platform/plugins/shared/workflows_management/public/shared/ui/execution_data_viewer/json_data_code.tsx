/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { monaco } from '@kbn/monaco';
import type { JsonValue } from '@kbn/utility-types';
import { JSONCodeEditorCommonMemoized } from './json_editor_common';

interface JsonDataCodeProps {
  json: JsonValue;
  /**
   * Maximum number of lines to display before requiring "Show more" expansion.
   * If unset, the editor uses its full height.
   */
  clampLines?: number;
  /**
   * Hide the inner copy-to-clipboard toolbar above the editor. Useful when the
   * caller already provides a copy affordance in its own header.
   */
  hideToolbar?: boolean;
}

export const JsonDataCode = ({ json, clampLines, hideToolbar }: JsonDataCodeProps) => {
  const formattedJson = useMemo(() => JSON.stringify(json, null, 2), [json]);
  const [isExpanded, setIsExpanded] = useState(false);
  // Monaco-reported rendered content height. With `wordWrap: 'on'` a single logical
  // line can span multiple visual lines, so we can't compute height from `\n` count
  // alone — we have to ask the editor for its actual height.
  const [contentHeight, setContentHeight] = useState<number | null>(null);

  const lineCount = useMemo(() => formattedJson.split('\n').length, [formattedJson]);

  // When collapsed, slice to the first N logical lines so Monaco can't scroll to
  // reveal the hidden lines. The actual rendered height (which accounts for
  // wrapping) is reported back via onDidContentSizeChange below.
  const displayedJson = useMemo(() => {
    if (clampLines == null || isExpanded || lineCount <= clampLines) {
      return formattedJson;
    }
    return formattedJson.split('\n').slice(0, clampLines).join('\n');
  }, [formattedJson, clampLines, isExpanded, lineCount]);

  const handleEditorMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    const sync = () => setContentHeight(editor.getContentHeight());
    sync();
    editor.onDidContentSizeChange(sync);
  }, []);

  const heightStyle = useMemo(() => {
    if (clampLines == null) {
      return contentHeight != null ? `${contentHeight}px` : '100%';
    }
    // Use Monaco's measured content height — this includes the impact of word
    // wrap so long lines never get clipped. Pre-mount fall back to a rough
    // estimate so the layout doesn't jump when the editor first appears.
    if (contentHeight != null) return `${contentHeight}px`;
    const visibleLines = isExpanded ? lineCount : Math.min(lineCount, clampLines);
    return `${visibleLines * 19 + 12}px`;
  }, [clampLines, isExpanded, lineCount, contentHeight]);

  return (
    <>
      <JSONCodeEditorCommonMemoized
        data-test-subj="workflowStepResultJsonEditor"
        jsonValue={displayedJson}
        onEditorDidMount={handleEditorMount}
        height={heightStyle}
        hasLineNumbers
        enableFindAction
        hideCopyButton={hideToolbar}
        hideScrollbars
      />
      {clampLines != null && lineCount > clampLines && (
        <EuiButtonEmpty
          size="xs"
          iconType={isExpanded ? 'arrowUp' : 'arrowDown'}
          onClick={() => setIsExpanded((v) => !v)}
          data-test-subj="workflowJsonDataCodeToggle"
        >
          {isExpanded
            ? i18n.translate('workflowsManagement.jsonDataCode.showLess', {
                defaultMessage: 'Show less',
              })
            : i18n.translate('workflowsManagement.jsonDataCode.showMoreLines', {
                defaultMessage: 'Show all {count} lines',
                values: { count: lineCount },
              })}
        </EuiButtonEmpty>
      )}
    </>
  );
};
