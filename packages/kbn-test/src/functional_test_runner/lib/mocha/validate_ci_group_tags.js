/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/utils';

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
    if (getCiGroups(suite).length > 1) {
      suitesWithMultipleCiGroups.push(suite);
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
