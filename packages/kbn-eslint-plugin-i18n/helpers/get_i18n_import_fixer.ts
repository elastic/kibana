/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SourceCode } from 'eslint';

const KIBANA_I18N_IMPORT = "import { i18n } from '@kbn/i18n';" as const;

export function getI18nImportFixer({ sourceCode }: { sourceCode: SourceCode }) {
  const hasI18nImportLine = Boolean(sourceCode.lines.find((l) => l === KIBANA_I18N_IMPORT));
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
    i18nImportLine: KIBANA_I18N_IMPORT,
    rangeToAddI18nImportLine: [start, end] as [number, number],
  };
}
