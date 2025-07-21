/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import Path from 'path';
import chalk from 'chalk';
import { getTextDisplayedWidth } from '../terminal';

const ELLIPSIS = '...';

export function formatFilepath(filepath: string, max: number): string {
  if (getTextDisplayedWidth(filepath) <= max) {
    const dirname = Path.dirname(filepath);
    const basename = Path.basename(filepath);
    return (dirname === '.' ? '' : dirname + Path.sep) + chalk.blueBright(basename);
  }

  const pathParts = filepath.split(Path.sep);
  const segments: string[] = [];
  let totalLength = 0;
  let truncated = false;

  // Always keep the last segment (filename)
  const basename = pathParts.pop()!;
  segments.unshift(basename);
  totalLength += basename.length;

  // Add as many segments from the end as will fit
  while (pathParts.length) {
    const next = pathParts.pop()!;
    const sepLen = 1;
    const ellipsisLen = truncated ? 0 : ELLIPSIS.length + sepLen;
    // If adding next segment would overflow, stop and add ellipsis
    if (totalLength + sepLen + next.length + ellipsisLen > max) {
      segments.unshift(ELLIPSIS);
      truncated = true;
      break;
    }
    segments.unshift(next);
    totalLength += sepLen + next.length;
  }

  // Build output, always color the last segment
  return segments
    .map((part, i) => (i === segments.length - 1 ? chalk.blueBright(part) : part))
    .join(Path.sep);
}
