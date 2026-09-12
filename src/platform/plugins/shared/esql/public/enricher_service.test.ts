/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { EnricherService } from './enricher_service';

interface TestItem {
  name: string;
}

const makeItems = (...names: string[]): TestItem[] => names.map((name) => ({ name }));

describe('EnricherService', () => {
  let service: EnricherService<TestItem>;
  let logger: MockedLogger;

  beforeEach(() => {
    logger = loggerMock.create();
    service = new EnricherService<TestItem>(logger, 'TestEnricher');
  });

  describe('enrich', () => {
    it('returns items unchanged when no enrichers are registered', async () => {
      const items = makeItems('my-item');
      expect(await service.enrich(items)).toBe(items);
    });
  });

  describe('register', () => {
    it('applies a single enricher to the items', async () => {
      const extra = makeItems('extra-item');
      service.register(async (items) => [...items, ...extra]);

      const result = await service.enrich(makeItems('my-item'));

      expect(result).toEqual([...makeItems('my-item'), ...extra]);
    });

    it('chains multiple enrichers in registration order', async () => {
      const order: number[] = [];
      service.register(async (items) => {
        order.push(1);
        return [...items, ...makeItems('from-enricher-1')];
      });
      service.register(async (items) => {
        order.push(2);
        return [...items, ...makeItems('from-enricher-2')];
      });

      const result = await service.enrich(makeItems('base'));

      expect(order).toEqual([1, 2]);
      expect(result.map((s) => s.name)).toEqual(['base', 'from-enricher-1', 'from-enricher-2']);
    });

    it('passes the output of each enricher as input to the next', async () => {
      service.register(async (items) => items.map((s) => ({ ...s, name: `${s.name}-a` })));
      service.register(async (items) => items.map((s) => ({ ...s, name: `${s.name}-b` })));

      const result = await service.enrich(makeItems('item'));

      expect(result.map((s) => s.name)).toEqual(['item-a-b']);
    });
  });

  describe('error handling', () => {
    it('skips a failing enricher and continues with the next one', async () => {
      const failure = new Error('enricher failure');
      service.register(async () => {
        throw failure;
      });
      service.register(async (items) => [...items, ...makeItems('from-enricher-2')]);

      const result = await service.enrich(makeItems('base'));

      expect(result.map((s) => s.name)).toEqual(['base', 'from-enricher-2']);
      expect(logger.error).toHaveBeenCalledWith(failure);
    });

    it('uses the last successful output when a middle enricher fails', async () => {
      service.register(async (items) => [...items, ...makeItems('from-enricher-1')]);
      service.register(async () => {
        throw new Error('middle failure');
      });
      service.register(async (items) => [...items, ...makeItems('from-enricher-3')]);

      const result = await service.enrich(makeItems('base'));

      expect(result.map((s) => s.name)).toEqual(['base', 'from-enricher-1', 'from-enricher-3']);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });
});
