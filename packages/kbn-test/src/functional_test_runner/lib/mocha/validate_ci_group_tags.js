/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';

/**
 * Traverse the suites configured and ensure that each suite has no more than one ciGroup assigned
 *
 * @param {ToolingLog} log
 * @param {Mocha} mocha
 */
export function validateCiGroupTags(log, mocha) {
  const tagCache = new Map();
  const getTags = (suite) => {
    const cached = tagCache.get(suite);
    if (cached) {
      return cached;
    }

    const allTags = [
      ...new Set([...(suite.parent ? getTags(suite.parent) : []), ...(suite._tags ?? [])]),
    ];
    tagCache.set(suite, allTags);
    return allTags;
  };

  const getCiGroups = (suite) => {
    return getTags(suite).filter((t) => t.startsWith('ciGroup'));
  };

  const getTitles = (suite) => {
    const all = suite.parent ? getTitles(suite.parent) : [];
    if (suite.title) {
      all.push(suite.title.trim());
    }
    return all;
  };

  const suitesWithMultipleCiGroups = [];

  const queue = [mocha.suite];
  while (queue.length) {
    const suite = queue.shift();
    if (getCiGroups(suite).length) {
      throw new Error(
        'ciGroups are no longer needed and should be removed. If you need to split up your FTR config because it is taking too long to complete then create one or more a new FTR config files and split your test files amoungst them'
      );
    } else {
      queue.push(...(suite.suites ?? []));
    }
  }

  if (suitesWithMultipleCiGroups.length) {
    const list = suitesWithMultipleCiGroups
      .map((s) => {
        const groups = getCiGroups(s).join(', ');
        const title = getTitles(s).join(' > ') || '';
        const from = s.file ? ` (from: ${Path.relative(REPO_ROOT, s.file)})` : '';

        return ` - ${groups}: ${title}${from}`;
      })
      .join('\n');

    log.error(
      `${suitesWithMultipleCiGroups.length} suites found which are assigned to multiple ciGroups:\n${list}`
    );

    throw new Error('some suites have mutliple ciGroup tags');
  }
}
