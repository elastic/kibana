/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useRef } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { monaco } from '@kbn/monaco';
import { i18n } from '@kbn/i18n';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { MapCache } from 'lodash';

export type MonacoMessage = monaco.editor.IMarkerData;

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

const quotedWarningMessageRegexp = /"(.*?)"/g;

export const parseWarning = (warning: string): MonacoMessage[] => {
  if (quotedWarningMessageRegexp.test(warning)) {
    const matches = warning.match(quotedWarningMessageRegexp);
    if (matches) {
      return matches.map((message) => {
        // start extracting the quoted message and with few default positioning
        let warningMessage = message.replace(/"/g, '');
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
          // extract the length of the "expression" within the message
          // and try to guess the correct size for the editor marker to highlight
          if (/\[.*\]/.test(warningMessage)) {
            const [_, wordWithError] = warningMessage.split('[');
            if (wordWithError) {
              errorLength = wordWithError.length;
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
    },
  ];
};

export const parseErrors = (errors: Error[], code: string): MonacoMessage[] => {
  return errors.map((error) => {
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
      };
    } else if (error.message.includes('expression was aborted')) {
      return {
        message: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.aborted', {
          defaultMessage: 'Request was aborted',
        }),
        startColumn: 1,
        startLineNumber: 1,
        endColumn: 10,
        endLineNumber: 1,
        severity: monaco.MarkerSeverity.Warning,
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
      };
    }
  });
};

export const getDocumentationSections = async (language: string) => {
  const groups: Array<{
    label: string;
    description?: string;
    items: Array<{ label: string; description?: JSX.Element }>;
  }> = [];
  if (language === 'esql') {
    const {
      sourceCommands,
      processingCommands,
      initialSection,
      functions,
      aggregationFunctions,
      operators,
    } = await import('./esql_documentation_sections');
    groups.push({
      label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.esql', {
        defaultMessage: 'ES|QL',
      }),
      items: [],
    });
    groups.push(sourceCommands, processingCommands, functions, aggregationFunctions, operators);
    return {
      groups,
      initialSection,
    };
  }
};

export const getInlineEditorText = (queryString: string, isMultiLine: boolean) => {
  return isMultiLine ? queryString.replace(/\r?\n|\r/g, ' ').replace(/  +/g, ' ') : queryString;
};

export const getWrappedInPipesCode = (code: string, isWrapped: boolean): string => {
  const pipes = code?.split('|');
  const codeNoLines = pipes?.map((pipe) => {
    return pipe.replaceAll('\n', '').trim();
  });
  return codeNoLines.join(isWrapped ? ' | ' : '\n| ');
};

export const getIndicesList = async (dataViews: DataViewsPublicPluginStart) => {
  const indices = await dataViews.getIndices({
    showAllIndices: false,
    pattern: '*',
    isRollupIndex: () => false,
  });
  return indices.map((index) => ({ name: index.name, hidden: index.name.startsWith('.') }));
};

export const getRemoteIndicesList = async (dataViews: DataViewsPublicPluginStart) => {
  const indices = await dataViews.getIndices({
    showAllIndices: false,
    pattern: '*:*',
    isRollupIndex: () => false,
  });
  const indicesWithNoAliases = indices.filter((source) => !Boolean(source.item.indices));

  const finalIndicesList = indicesWithNoAliases.filter((source) => {
    const [_, index] = source.name.split(':');
    return !index.startsWith('.');
  });

  return finalIndicesList.map((source) => ({ name: source.name, hidden: false }));
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
