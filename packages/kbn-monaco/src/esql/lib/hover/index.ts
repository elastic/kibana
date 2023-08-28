/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializedEnrichPolicy } from '@kbn/index-management-plugin/common';
import type { Datatable } from '@kbn/expressions-plugin/public';
import { monaco } from '../../../monaco_imports';

function findEnrichStatementPosition(fullText: string, position: number) {
  const lastPipeBeforeIndex = fullText.substring(0, position).lastIndexOf('|');
  const nextPipeBeforeIndex = fullText.substring(lastPipeBeforeIndex + 1).indexOf('|');
  const statementEnd = nextPipeBeforeIndex !== -1 ? nextPipeBeforeIndex : fullText.length;
  return {
    text: fullText.substring(lastPipeBeforeIndex + 1, statementEnd),
    start: lastPipeBeforeIndex,
    end: statementEnd,
  };
}

function findPreviousWord(fullText: string, position: number) {
  const { text } = findEnrichStatementPosition(fullText, position);
  return text.split(' ').filter((w) => w.trim().length)[0];
}

function getPolicyName(fullText: string, position: number) {
  const { text: enrichStatement, end } = findEnrichStatementPosition(fullText, position);
  const enrichIndex = enrichStatement.toLowerCase().indexOf('enrich');
  return enrichStatement
    .substring(enrichIndex + 6, end)
    .split(' ')
    .filter((w) => w.trim().length)[0];
}

export interface HoverProviderProps {
  getCurrentPolicies: () => SerializedEnrichPolicy[];
  getResultPreview: (partialQuery: string) => Promise<Datatable | undefined>;
}

export function createHoverProvider({ getCurrentPolicies, getResultPreview }: HoverProviderProps) {
  return {
    provideHover: async (
      model: monaco.editor.ITextModel,
      position: monaco.Position,
      token: monaco.CancellationToken
    ) => {
      const innerText = model.getValue();
      const textRange = model.getFullModelRange();

      const lengthAfterPosition = model.getValueLengthInRange({
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: textRange.endLineNumber,
        endColumn: textRange.endColumn,
      });

      const currentPosition = innerText.length - lengthAfterPosition;

      if (innerText[currentPosition] === '|') {
        const isLastPipeAtEnd = innerText[innerText.length - 1] === '|';
        const partialExpression = innerText.substring(
          0,
          innerText.length - lengthAfterPosition - (isLastPipeAtEnd ? 1 : 2)
        );
        try {
          const table = await getResultPreview(partialExpression);
          if (!table) {
            return { contents: [] };
          }
          return {
            contents: [
              {
                value: 'Table preview',
              },
              {
                value: `${table.columns.map((column) => column.name).join(' | ')}${table.rows.map(
                  (row) => table.columns.map((c) => row[c.id])
                )}`,
              },
            ],
          };
          // eslint-disable-next-line no-empty
        } catch (e) {}
      }
      const word = model.getWordAtPosition(position);

      if (word?.word && findPreviousWord(innerText, currentPosition) === 'enrich') {
        const policyName = getPolicyName(innerText, currentPosition);
        const hoveredPolicy = getCurrentPolicies().find((policy) => policy.name === policyName);
        // TODO: improve range highlight
        return {
          contents: [
            { value: 'Policy preview' },
            { value: JSON.stringify(hoveredPolicy, null, 2) },
          ],
        };
      }

      return { contents: [] };
    },
  };
}
