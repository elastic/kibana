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
import type { EsqlView } from '@kbn/esql-types';
import { ViewEnricherService } from './view_enricher_service';

const makeViews = (...names: string[]): EsqlView[] =>
  names.map((name) => ({ name, query: `FROM ${name}` }));

describe('ViewEnricherService', () => {
  let service: ViewEnricherService;
  let logger: MockedLogger;

  beforeEach(() => {
    logger = loggerMock.create();
    service = new ViewEnricherService(logger);
  });

  describe('enrich', () => {
    it('returns views unchanged when no enrichers are registered', async () => {
      const views = makeViews('my-view');
      expect(await service.enrich(views)).toBe(views);
    });
  });

  describe('register', () => {
    it('applies a single enricher to the views', async () => {
      const extra = makeViews('extra-view');
      service.register(async (views) => [...views, ...extra]);

      const result = await service.enrich(makeViews('my-view'));

      expect(result).toEqual([...makeViews('my-view'), ...extra]);
    });

    it('chains multiple enrichers in registration order', async () => {
      const order: number[] = [];
      service.register(async (views) => {
        order.push(1);
        return [...views, ...makeViews('from-enricher-1')];
      });
      service.register(async (views) => {
        order.push(2);
        return [...views, ...makeViews('from-enricher-2')];
      });

      const result = await service.enrich(makeViews('base'));

      expect(order).toEqual([1, 2]);
      expect(result.map((v) => v.name)).toEqual(['base', 'from-enricher-1', 'from-enricher-2']);
    });

    it('passes the output of each enricher as input to the next', async () => {
      service.register(async (views) => views.map((v) => ({ ...v, name: `${v.name}-a` })));
      service.register(async (views) => views.map((v) => ({ ...v, name: `${v.name}-b` })));

      const result = await service.enrich(makeViews('view'));

      expect(result.map((v) => v.name)).toEqual(['view-a-b']);
    });
  });

  describe('error handling', () => {
    it('skips a failing enricher and continues with the next one', async () => {
      const failure = new Error('enricher failure');
      service.register(async () => {
        throw failure;
      });
      service.register(async (views) => [...views, ...makeViews('from-enricher-2')]);

      const result = await service.enrich(makeViews('base'));

      expect(result.map((v) => v.name)).toEqual(['base', 'from-enricher-2']);
      expect(logger.error).toHaveBeenCalledWith(failure);
    });

    it('uses the last successful output when a middle enricher fails', async () => {
      service.register(async (views) => [...views, ...makeViews('from-enricher-1')]);
      service.register(async () => {
        throw new Error('middle failure');
      });
      service.register(async (views) => [...views, ...makeViews('from-enricher-3')]);

      const result = await service.enrich(makeViews('base'));

      expect(result.map((v) => v.name)).toEqual(['base', 'from-enricher-1', 'from-enricher-3']);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });
});
