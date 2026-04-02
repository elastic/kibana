/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLSourceResult } from '@kbn/esql-types';
import { SourceEnricherService } from './source_enricher_service';

const makeSources = (...names: string[]): ESQLSourceResult[] =>
  names.map((name) => ({ name, hidden: false }));

describe('SourceEnricherService', () => {
  let service: SourceEnricherService;

  beforeEach(() => {
    service = new SourceEnricherService();
  });

  describe('getComposedEnricher', () => {
    it('returns undefined when no enrichers are registered', () => {
      expect(service.getComposedEnricher()).toBeUndefined();
    });

    it('returns a function when at least one enricher is registered', () => {
      service.register(async (sources) => sources);
      expect(typeof service.getComposedEnricher()).toBe('function');
    });
  });

  describe('register', () => {
    it('applies a single enricher to the sources', async () => {
      const extra = makeSources('extra-index');
      service.register(async (sources) => [...sources, ...extra]);

      const enricher = service.getComposedEnricher()!;
      const result = await enricher(makeSources('my-index'));

      expect(result).toEqual([...makeSources('my-index'), ...extra]);
    });

    it('chains multiple enrichers in registration order', async () => {
      const order: number[] = [];
      service.register(async (sources) => {
        order.push(1);
        return [...sources, ...makeSources('from-enricher-1')];
      });
      service.register(async (sources) => {
        order.push(2);
        return [...sources, ...makeSources('from-enricher-2')];
      });

      const enricher = service.getComposedEnricher()!;
      const result = await enricher(makeSources('base'));

      expect(order).toEqual([1, 2]);
      expect(result.map((s) => s.name)).toEqual(['base', 'from-enricher-1', 'from-enricher-2']);
    });

    it('passes the output of each enricher as input to the next', async () => {
      service.register(async (sources) => sources.map((s) => ({ ...s, name: `${s.name}-a` })));
      service.register(async (sources) => sources.map((s) => ({ ...s, name: `${s.name}-b` })));

      const enricher = service.getComposedEnricher()!;
      const result = await enricher(makeSources('index'));

      expect(result.map((s) => s.name)).toEqual(['index-a-b']);
    });
  });

  describe('error handling', () => {
    it('skips a failing enricher and continues with the next one', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      service.register(async () => {
        throw new Error('enricher failure');
      });
      service.register(async (sources) => [...sources, ...makeSources('from-enricher-2')]);

      const enricher = service.getComposedEnricher()!;
      const result = await enricher(makeSources('base'));

      expect(result.map((s) => s.name)).toEqual(['base', 'from-enricher-2']);
      expect(consoleSpy).toHaveBeenCalledWith('ES|QL source enricher failed:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('uses the last successful output when a middle enricher fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      service.register(async (sources) => [...sources, ...makeSources('from-enricher-1')]);
      service.register(async () => {
        throw new Error('middle failure');
      });
      service.register(async (sources) => [...sources, ...makeSources('from-enricher-3')]);

      const enricher = service.getComposedEnricher()!;
      const result = await enricher(makeSources('base'));

      expect(result.map((s) => s.name)).toEqual(['base', 'from-enricher-1', 'from-enricher-3']);

      consoleSpy.mockRestore();
    });
  });
});
