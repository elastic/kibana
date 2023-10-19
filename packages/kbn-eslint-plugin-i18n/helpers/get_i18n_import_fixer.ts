/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SourceCode } from 'eslint';

const KBN_I18N_I18N_IMPORT = "import { i18n } from '@kbn/i18n';" as const;
const KBN_I18N_REACT_FORMATTED_MESSAGE_IMPORT =
  "import { FormattedMessage } from '@kbn/i18n-react';" as const;
export function getI18nImportFixer({
  sourceCode,
  mode,
}: {
  sourceCode: SourceCode;
  mode: 'i18n.translate' | 'FormattedMessage';
}) {
  const hasI18nImportLine = Boolean(
    sourceCode.lines.find((l) =>
      mode === 'i18n.translate'
        ? l === KBN_I18N_I18N_IMPORT
        : l === KBN_I18N_REACT_FORMATTED_MESSAGE_IMPORT
    )
  );

  if (hasI18nImportLine) return { hasI18nImportLine };

  // Translation package has not been imported yet so we need to add it.
  // Pretty safe bet to add it underneath the React import.
  const reactImportLineIndex = sourceCode.lines.findIndex((l) => l.includes("from 'react'"));

  const targetLine = sourceCode.lines[reactImportLineIndex];
  const column = targetLine.length;

  const start = sourceCode.getIndexFromLoc({ line: reactImportLineIndex + 1, column: 0 });
  const end = sourceCode.getIndexFromLoc({
    line: reactImportLineIndex + 1,
    column,
  });

  return {
    hasI18nImportLine,
    i18nPackageImportLine:
      mode === 'i18n.translate' ? KBN_I18N_I18N_IMPORT : KBN_I18N_REACT_FORMATTED_MESSAGE_IMPORT,
    rangeToAddI18nImportLine: [start, end] as [number, number],
  };
}
