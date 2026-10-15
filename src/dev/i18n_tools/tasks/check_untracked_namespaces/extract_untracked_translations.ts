/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import normalize from 'normalize-path';
import { readFile as readFileAsync } from 'fs/promises';
import { globNamespacePaths, makeAbsolutePath, normalizePath } from '../../utils';
import type { ErrorReporter } from '../../utils';
import { extractI18nMessageDescriptors } from '../../extractors/formatjs';
import { I18N_CALL_PATTERN } from '../../constants';
import type { MessageDescriptor } from '../../types';

const MAX_LISTED_IDS = 5;

const ALWAYS_IGNORED_DIRS = [
  'src/platform/packages/shared/kbn-i18n',
  'src/platform/packages/shared/kbn-i18n-react',
  'packages/kbn-plugin-generator/template',
  'src/dev',
];

const ALWAYS_IGNORED_PATTERNS = [
  '**/build/**',
  '**/__fixtures__/**',
  '**/test/**',
  '**/scripts/**',
  '**/target/**',
  '**/dist/**',
];

export const REGISTRATION_HINT =
  'Register the module path under a namespace in .i18nrc.json (or x-pack/.i18nrc.json with an xpack. prefix), or add the module path to that file\'s "exclude" list to defer it.';

export interface UntrackedExtraction {
  untrackedFilePath: string;
  extractedMessages: Map<string, MessageDescriptor>;
  parseError?: Error;
  totalChecked: number;
  totalToCheck: number;
}

/**
 * Converts registered namespace and excluded directories into globby ignore patterns
 * relative to `rootPath`, which is what `globTranslationFiles` runs globby against.
 */
export const getIgnorePatternsForRoot = (rootPath: string, ignoredDirs: string[]) => {
  const absoluteRootPath = makeAbsolutePath(rootPath, true);

  return ignoredDirs
    .map((dir) => makeAbsolutePath(dir))
    .filter((dir) => dir.startsWith(absoluteRootPath))
    .map((dir) => `${normalize(path.relative(absoluteRootPath, dir))}/**`);
};

/** True when `rootPath` is itself, or sits inside, one of the ignored directories. */
export const isRootIgnored = (rootPath: string, ignoredDirs: string[]) => {
  const absoluteRootPath = makeAbsolutePath(rootPath, true);

  return ignoredDirs.some((dir) => absoluteRootPath.startsWith(makeAbsolutePath(dir, true)));
};

const emptyMessages = () => new Map<string, MessageDescriptor>();

const extractOrCaptureParseError = (filePath: string, source: string) =>
  extractI18nMessageDescriptors(normalizePath(filePath), source).then(
    (extractedMessages) => ({ extractedMessages, parseError: undefined }),
    (parseError: Error) => ({ extractedMessages: emptyMessages(), parseError })
  );

/** Yields every file under `rootPath` outside `ignoredDirs` (registered and excluded directories) with its extracted messages or parse error. */
export async function* extractUntrackedMessages(
  rootPath: string,
  ignoredDirs: string[]
): AsyncGenerator<UntrackedExtraction> {
  if (isRootIgnored(rootPath, ignoredDirs)) {
    return;
  }

  const untrackedFiles = await globNamespacePaths(rootPath, {
    additionalIgnore: [
      ...getIgnorePatternsForRoot(rootPath, [...ignoredDirs, ...ALWAYS_IGNORED_DIRS]),
      ...ALWAYS_IGNORED_PATTERNS,
    ],
    absolute: true,
  });
  const totalToCheck = untrackedFiles.length;

  for (const [index, untrackedFilePath] of untrackedFiles.entries()) {
    const source = await readFileAsync(untrackedFilePath, 'utf8');
    const extraction = I18N_CALL_PATTERN.test(source)
      ? await extractOrCaptureParseError(untrackedFilePath, source)
      : { extractedMessages: emptyMessages(), parseError: undefined };

    yield { untrackedFilePath, ...extraction, totalChecked: index + 1, totalToCheck };
  }
}

export const formatUntrackedFileError = (filePath: string, ids: string[]) => {
  const listed = ids.slice(0, MAX_LISTED_IDS).join(', ');
  const rest = ids.length > MAX_LISTED_IDS ? ` (+${ids.length - MAX_LISTED_IDS} more)` : '';

  return `${normalizePath(filePath)} contains ${
    ids.length
  } i18n message id(s) outside every registered namespace path: ${listed}${rest}.\n${REGISTRATION_HINT}`;
};

/** Reports a parse failure or an untracked file to the reporter; files without messages are ignored. */
export const reportUntrackedExtraction = (
  errorReporter: ErrorReporter,
  { untrackedFilePath, extractedMessages, parseError }: UntrackedExtraction
) => {
  if (parseError) {
    errorReporter.report(parseError);
    return;
  }

  if (extractedMessages.size > 0) {
    errorReporter.report(
      formatUntrackedFileError(untrackedFilePath, [...extractedMessages.keys()])
    );
  }
};
