/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { walk } from '@elastic/esql';
import type { ESQLCommand } from '@elastic/esql/types';
import { getFieldPatternMatcher } from '../../definitions/utils/regex';
import type { ESQLColumnData } from '../types';

export const columnsAfter = (command: ESQLCommand, previousColumns: ESQLColumnData[]) => {
  const exactNames = new Set<string>();
  const patterns: Array<(name: string) => boolean> = [];

  walk(command, {
    visitColumn: (node) => {
      const matcher = getFieldPatternMatcher(node.text);
      if (matcher) {
        patterns.push(matcher);
      } else {
        exactNames.add(node.parts.join('.'));
      }
    },
  });

  return previousColumns.filter(
    ({ name }) => !exactNames.has(name) && !patterns.some((match) => match(name))
  );
};
