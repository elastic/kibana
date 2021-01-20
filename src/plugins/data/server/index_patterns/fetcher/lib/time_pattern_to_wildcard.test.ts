/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { timePatternToWildcard } from './time_pattern_to_wildcard';

describe('server/index_patterns/service/lib/time_pattern_to_wildcard', () => {
  const tests = [
    ['[logstash-]YYYY.MM.DD', 'logstash-*'],
    ['YYYY[-department-].w', '*-department-*'],
    ['YYYY.MM[.department].w', '*.department*'],
    ['YYYY.MM.[department].w[-old]', '*department*-old'],
  ];

  tests.forEach(([input, expected]) => {
    it(`parses ${input}`, () => {
      const output = timePatternToWildcard(input);
      if (output !== expected) {
        throw new Error(`expected ${input} to parse to ${expected} but got ${output}`);
      }
    });
  });
});
