/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { APMIndices } from '@kbn/apm-sources-access-plugin/public';
import { createTracesContextService } from './traces_context_service';

describe('traces_context_service', () => {
  describe('when APM indices are not available', () => {
    it('falls back to the default trace/traces regexp', () => {
      const service = createTracesContextService({ indices: null });
      expect(service.isTracesIndexPattern('traces-*')).toBe(true);
      expect(service.isTracesIndexPattern('trace-*')).toBe(true);
      expect(service.isTracesIndexPattern('logs-*')).toBe(false);
    });
  });

  describe('when APM indices are available', () => {
    const indices: APMIndices = {
      transaction: 'traces-apm*,apm-*,traces-*.otel-*',
      span: 'traces-apm*,apm-*,traces-*.otel-*',
      error: '',
      metric: '',
      onboarding: '',
      sourcemap: '',
    };

    it('matches individual allowed indices and the full combined list', () => {
      const service = createTracesContextService({ indices });
      // full combined list (as returned by getAllTracesIndexPattern())
      expect(service.isTracesIndexPattern('traces-apm*,apm-*,traces-*.otel-*')).toBe(true);
      // individual tokens should match
      expect(service.isTracesIndexPattern('traces-apm*')).toBe(true);
      expect(service.isTracesIndexPattern('apm-*')).toBe(true);
      expect(service.isTracesIndexPattern('traces-*.otel-*')).toBe(true);
      // extra/unrelated patterns should be rejected
      expect(service.isTracesIndexPattern('logs-*')).toBe(false);
      // different ordering is NOT an exact string match, so it should be rejected
      expect(service.isTracesIndexPattern('apm-*,traces-*.otel-*,traces-apm*')).toBe(false);
      // extra/unrelated patterns should be rejected
      expect(service.isTracesIndexPattern('traces-apm*,apm-*,traces-*.otel-*, logs-*')).toBe(false);
    });
  });
});
