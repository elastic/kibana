/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SourceCode } from 'eslint';

export function getI18nImportFixer({
  sourceCode,
  translationFunction,
}: {
  sourceCode: SourceCode;
  translationFunction: 'i18n.translate' | 'FormattedMessage';
}) {
  let existingI18nImportLineIndex = -1;
  let i18nImportLineToBeAdded = '';

  /**
   *
   * Searching through sourcecode to see if there is already an import of i18n package,
   * and check if it includes the module we need.
   *
   * If any of these conditions are not met, we prepare the import line we need to add.
   *
   * */

  if (translationFunction === 'i18n.translate') {
    existingI18nImportLineIndex = sourceCode.lines.findIndex((l) => l.includes("from '@kbn/i18n'"));

    const i18nImportLineInSource = sourceCode.lines[existingI18nImportLineIndex];

    if (i18nImportLineInSource) {
      const modules = i18nImportLineInSource.split('{')[1].split('}')[0].trim();

      if (modules.split(',').includes('i18n')) {
        return { hasI18nImportLine: true };
      }

      // Existing import is something like: `import { SomeOtherModule } from '@kbn/i18n';`
      i18nImportLineToBeAdded = `import { ${modules}, i18n } from '@kbn/i18n';`;
    } else {
      i18nImportLineToBeAdded = `import { i18n } from '@kbn/i18n';`;
    }
  }

  if (translationFunction === 'FormattedMessage') {
    existingI18nImportLineIndex = sourceCode.lines.findIndex((l) =>
      l.includes("from '@kbn/i18n-react'")
    );
    const i18nImportLineInSource = sourceCode.lines[existingI18nImportLineIndex];

    if (i18nImportLineInSource) {
      const modules = i18nImportLineInSource.split('{')[1].split('}')[0].trim();

      if (modules.split(',').includes('FormattedMessage')) {
        return { hasI18nImportLine: true };
      }

      // Existing import is something like: `import { SomeOtherModule } from '@kbn/i18n-react';`
      i18nImportLineToBeAdded = `import { ${modules}, FormattedMessage } from '@kbn/i18n-react';`;
    } else {
      i18nImportLineToBeAdded = `import { FormattedMessage } from '@kbn/i18n-react';`;
    }
  }

  /**
   *
   * Determining where in the source code to add the import line.
   *
   * */

  // If the file already has an import line for the translation package but it doesn't include the module we need, we need to add it.
  if (existingI18nImportLineIndex > -1) {
    const targetLine = sourceCode.lines[existingI18nImportLineIndex];
    const column = targetLine.length;

    const start = sourceCode.getIndexFromLoc({ line: existingI18nImportLineIndex + 1, column: 0 });
    const end = start + column;

    return {
      i18nImportLine: i18nImportLineToBeAdded,
      rangeToAddI18nImportLine: [start, end] as [number, number],
      replaceMode: 'replace',
    };
  }

  // If the file doesn't have an import line for the translation package yet, we need to add it.
  // Pretty safe bet to add it underneath the import line for React.
  let lineIndex = sourceCode.lines.findIndex((l) => l.includes("from 'react'"));

  if (lineIndex === -1) {
    lineIndex = sourceCode.lines.findIndex((l) => l.includes('*/'));
  }

  if (lineIndex === -1) {
    lineIndex = 0;
  }

  const targetLine = sourceCode.lines[lineIndex];

  // `getIndexFromLoc` is 0-based, so we need to add 1 to the line index.
  const start = sourceCode.getIndexFromLoc({ line: lineIndex + 1, column: 0 });
  const end = start + targetLine.length;

  return {
    i18nImportLine: i18nImportLineToBeAdded,
    rangeToAddI18nImportLine: [start, end] as [number, number],
    replaceMode: 'insert',
  };
}
