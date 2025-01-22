/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isCCSRemoteIndexName } from './utils';

describe('util tests', () => {
  describe('isCCSRemoteIndexName', () => {
    it('should not validate empty string', () => {
      expect(isCCSRemoteIndexName('')).toBe(false);
    });

    it('should not validate date math expression', () => {
      expect(isCCSRemoteIndexName('<logstash-{now/d-2d}>')).toBe(false);
    });

    it('should not validate date math expression with negation', () => {
      expect(isCCSRemoteIndexName('-<logstash-{now/d-2d}>')).toBe(false);
    });

    it('should not validate invalid prefix', () => {
      expect(isCCSRemoteIndexName(':logstash-{now/d-2d}')).toBe(false);
    });

    it('should validate CCS pattern', () => {
      expect(isCCSRemoteIndexName('*:logstash-{now/d-2d}')).toBe(true);
    });
  });
});
