/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isNonLocalIndexName } from './utils';

describe('util tests', () => {
  describe('isNonLocalIndexName', () => {
    it('should not validate empty string', () => {
      expect(isNonLocalIndexName('')).toBe(false);
    });

    it('should not validate date math expression', () => {
      expect(isNonLocalIndexName('<logstash-{now/d-2d}>')).toBe(false);
    });

    it('should not validate date math expression with negation', () => {
      expect(isNonLocalIndexName('-<logstash-{now/d-2d}>')).toBe(false);
    });

    it('should not validate invalid prefix', () => {
      expect(isNonLocalIndexName(':logstash-{now/d-2d}')).toBe(false);
    });

    it('should validate CCS pattern', () => {
      expect(isNonLocalIndexName('*:logstash-{now/d-2d}')).toBe(true);
    });

    it('should not validate selector with wildcard', () => {
      expect(isNonLocalIndexName('my-data-stream::*')).toBe(false);
    });

    it('should not validate index name with selector', () => {
      expect(isNonLocalIndexName('my-data-stream::failures')).toBe(false);
    });

    it('should not validate wildcard with selector', () => {
      expect(isNonLocalIndexName('-logs-*::data')).toBe(false);
    });
  });
});
