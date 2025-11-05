/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '../../monaco_imports';

/**
 * Provides clickable link detection for URLs in the Console editor
 */
export const setupConsoleLinkProvider = (languageId: string) => {
  monaco.languages.registerLinkProvider(languageId, {
    provideLinks: (model: monaco.editor.ITextModel) => {
      const links: monaco.languages.ILink[] = [];

      // Regular expression to match HTTP/HTTPS URLs
      // This regex matches URLs that start with http:// or https://
      const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;

      const text = model.getValue();
      let match: RegExpExecArray | null;

      while ((match = urlRegex.exec(text)) !== null) {
        const startPos = model.getPositionAt(match.index);
        const endPos = model.getPositionAt(match.index + match[0].length);

        links.push({
          range: new monaco.Range(
            startPos.lineNumber,
            startPos.column,
            endPos.lineNumber,
            endPos.column
          ),
          url: match[0],
        });
      }

      return { links };
    },
  });
};
