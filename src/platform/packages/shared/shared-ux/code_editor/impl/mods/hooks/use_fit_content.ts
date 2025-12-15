/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { monaco } from '@kbn/monaco';

export const useFitToContent = ({
  editor,
  fitToContent,
  isFullScreen,
}: {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  isFullScreen: boolean;
  fitToContent?: { minLines?: number; maxLines?: number };
}) => {
  const isFitToContent = !!fitToContent;
  const minLines = fitToContent?.minLines;
  const maxLines = fitToContent?.maxLines;
  useEffect(() => {
    if (!editor) return;
    if (isFullScreen) return;
    if (!isFitToContent) return;

    const updateHeight = () => {
      const contentHeight = editor.getContentHeight();
      const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
      const minHeight = (minLines ?? 1) * lineHeight;
      let maxHeight = maxLines ? maxLines * lineHeight : contentHeight;
      maxHeight = Math.max(minHeight, maxHeight);
      editor.layout({
        height: Math.min(maxHeight, Math.max(minHeight, contentHeight)),
        width: editor.getLayoutInfo().width,
      });
    };
    updateHeight();
    const disposable = editor.onDidContentSizeChange(updateHeight);
    return () => {
      disposable.dispose();
      editor.layout(); // reset the layout that was controlled by the fitToContent
    };
  }, [editor, isFitToContent, minLines, maxLines, isFullScreen]);
};
