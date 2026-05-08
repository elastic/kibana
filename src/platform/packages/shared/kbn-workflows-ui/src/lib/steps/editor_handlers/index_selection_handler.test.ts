/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MatchedItem } from '@kbn/data-views-plugin/public';
import type { SelectionContext } from '@kbn/workflows/types/latest';
import {
  getIndexSelectionHandler,
  type IndexSelectionHandlerServices,
} from './index_selection_handler';

type IndexKind = 'index' | 'alias' | 'data_stream';

const TAG_LABELS: Record<IndexKind, string> = {
  index: 'Index',
  alias: 'Alias',
  data_stream: 'Data stream',
};

function buildMatchedItem(name: string, kind: IndexKind = 'index'): MatchedItem {
  return {
    name,
    tags: [{ key: kind, name: TAG_LABELS[kind], color: 'default' }],
    item: { name },
  };
}

const EMPTY_CONTEXT: SelectionContext<Record<string, unknown>, { index: string }> = {
  stepType: 'elasticsearch.search',
  scope: 'input',
  propertyKey: 'index',
  values: { config: {}, input: {} },
};

interface MockDataViews {
  getIndices: jest.Mock;
}

function createServices(): {
  services: IndexSelectionHandlerServices;
  dataViews: MockDataViews;
  getUrlForApp: jest.Mock;
} {
  const dataViews: MockDataViews = {
    getIndices: jest.fn(),
  };
  const getUrlForApp = jest
    .fn()
    .mockImplementation(
      (app: string, opts?: { deepLinkId?: string; path?: string }) =>
        `/app/${app}/${opts?.deepLinkId ?? opts?.path ?? ''}`
    );
  const services = {
    dataViews,
    application: { getUrlForApp },
  } as unknown as IndexSelectionHandlerServices;
  return { services, dataViews, getUrlForApp };
}

describe('getIndexSelectionHandler', () => {
  describe('search', () => {
    it('returns an empty list and skips network calls for empty input', async () => {
      const { services, dataViews } = createServices();
      const handler = getIndexSelectionHandler(services);

      await expect(handler.search('   ', EMPTY_CONTEXT)).resolves.toEqual([]);
      expect(dataViews.getIndices).not.toHaveBeenCalled();
    });

    it('appends a wildcard to the user input and queries getIndices once', async () => {
      const { services, dataViews } = createServices();
      dataViews.getIndices.mockResolvedValue([buildMatchedItem('logs-app-1')]);

      const handler = getIndexSelectionHandler(services);
      await handler.search('logs-', EMPTY_CONTEXT);

      expect(dataViews.getIndices).toHaveBeenCalledTimes(1);
      expect(dataViews.getIndices).toHaveBeenCalledWith(
        expect.objectContaining({ pattern: 'logs-*', showAllIndices: false })
      );
    });

    it('passes the user input through unchanged when it already ends with a wildcard', async () => {
      const { services, dataViews } = createServices();
      dataViews.getIndices.mockResolvedValue([buildMatchedItem('logs-app-1')]);

      const handler = getIndexSelectionHandler(services);
      await handler.search('logs-*', EMPTY_CONTEXT);

      expect(dataViews.getIndices).toHaveBeenCalledTimes(1);
      expect(dataViews.getIndices).toHaveBeenCalledWith(
        expect.objectContaining({ pattern: 'logs-*' })
      );
    });

    it('maps tag kinds to readable descriptions', async () => {
      const { services, dataViews } = createServices();
      dataViews.getIndices.mockResolvedValue([
        buildMatchedItem('metrics-index', 'index'),
        buildMatchedItem('metrics-alias', 'alias'),
        buildMatchedItem('metrics-stream', 'data_stream'),
      ]);

      const handler = getIndexSelectionHandler(services);
      const options = await handler.search('metrics', EMPTY_CONTEXT);

      const byValue = Object.fromEntries(options.map((o) => [o.value, o.description]));
      expect(byValue['metrics-index']).toBe('Type: Index');
      expect(byValue['metrics-alias']).toBe('Type: Alias');
      expect(byValue['metrics-stream']).toBe('Type: Data stream');
    });

    it('returns an empty list and swallows errors from getIndices', async () => {
      const { services, dataViews } = createServices();
      dataViews.getIndices.mockRejectedValue(new Error('boom'));

      const handler = getIndexSelectionHandler(services);
      await expect(handler.search('logs-', EMPTY_CONTEXT)).resolves.toEqual([]);
    });

    describe('allowWildcard option', () => {
      it('does not surface a wildcard suggestion by default, even with multiple matches', async () => {
        const { services, dataViews } = createServices();
        dataViews.getIndices.mockResolvedValue([
          buildMatchedItem('logs-app-1'),
          buildMatchedItem('logs-app-2'),
        ]);

        const handler = getIndexSelectionHandler(services);
        const options = await handler.search('logs-', EMPTY_CONTEXT);

        expect(options.map((o) => o.value)).toEqual(['logs-app-1', 'logs-app-2']);
      });

      it('prepends a wildcard suggestion when allowWildcard is true and matches more than one source', async () => {
        const { services, dataViews } = createServices();
        dataViews.getIndices.mockResolvedValue([
          buildMatchedItem('logs-app-1'),
          buildMatchedItem('logs-app-2'),
        ]);

        const handler = getIndexSelectionHandler(services, { allowWildcard: true });
        const options = await handler.search('logs-', EMPTY_CONTEXT);

        expect(options.map((o) => o.value)).toEqual(['logs-*', 'logs-app-1', 'logs-app-2']);
        expect(options[0].description).toMatch(/2 sources/);
      });

      it('omits the wildcard suggestion with allowWildcard: true when only one source matches', async () => {
        const { services, dataViews } = createServices();
        dataViews.getIndices.mockResolvedValue([buildMatchedItem('.alerts-default')]);

        const handler = getIndexSelectionHandler(services, { allowWildcard: true });
        const options = await handler.search('.alerts-default', EMPTY_CONTEXT);

        expect(options.map((o) => o.value)).toEqual(['.alerts-default']);
      });

      it('omits the wildcard suggestion with allowWildcard: true when the input already ends in a wildcard', async () => {
        const { services, dataViews } = createServices();
        dataViews.getIndices.mockResolvedValue([
          buildMatchedItem('logs-app-1'),
          buildMatchedItem('logs-app-2'),
        ]);

        const handler = getIndexSelectionHandler(services, { allowWildcard: true });
        const options = await handler.search('logs-*', EMPTY_CONTEXT);

        expect(options.map((o) => o.value)).toEqual(['logs-app-1', 'logs-app-2']);
      });
    });

    describe('showAllIndices option', () => {
      it('forwards showAllIndices: false to getIndices by default', async () => {
        const { services, dataViews } = createServices();
        dataViews.getIndices.mockResolvedValue([buildMatchedItem('logs-app-1')]);

        const handler = getIndexSelectionHandler(services);
        await handler.search('logs-', EMPTY_CONTEXT);

        expect(dataViews.getIndices).toHaveBeenCalledWith(
          expect.objectContaining({ showAllIndices: false })
        );

        dataViews.getIndices.mockClear();
        await handler.resolve('logs-app-1', EMPTY_CONTEXT);

        expect(dataViews.getIndices).toHaveBeenCalledWith(
          expect.objectContaining({ showAllIndices: false })
        );
      });

      it('forwards showAllIndices: true to getIndices when configured', async () => {
        const { services, dataViews } = createServices();
        dataViews.getIndices.mockResolvedValue([buildMatchedItem('.internal-index')]);

        const handler = getIndexSelectionHandler(services, { showAllIndices: true });
        await handler.search('.internal', EMPTY_CONTEXT);

        expect(dataViews.getIndices).toHaveBeenCalledWith(
          expect.objectContaining({ showAllIndices: true })
        );

        dataViews.getIndices.mockClear();
        await handler.resolve('.internal', EMPTY_CONTEXT);

        expect(dataViews.getIndices).toHaveBeenCalledWith(
          expect.objectContaining({ showAllIndices: true })
        );
      });
    });

    describe('maxResults option', () => {
      it('defaults to 20 results', async () => {
        const { services, dataViews } = createServices();
        const matches = Array.from({ length: 30 }, (_, i) => buildMatchedItem(`logs-${i}`));
        dataViews.getIndices.mockResolvedValue(matches);

        const handler = getIndexSelectionHandler(services);
        const options = await handler.search('logs-', EMPTY_CONTEXT);

        expect(options).toHaveLength(20);
        expect(options[0].value).toBe('logs-0');
        expect(options[19].value).toBe('logs-19');
      });

      it('caps the result list at the configured maximum', async () => {
        const { services, dataViews } = createServices();
        const matches = Array.from({ length: 10 }, (_, i) => buildMatchedItem(`logs-${i}`));
        dataViews.getIndices.mockResolvedValue(matches);

        const handler = getIndexSelectionHandler(services, { maxResults: 3 });
        const options = await handler.search('logs-', EMPTY_CONTEXT);

        expect(options.map((o) => o.value)).toEqual(['logs-0', 'logs-1', 'logs-2']);
      });

      it('counts the wildcard suggestion against maxResults', async () => {
        const { services, dataViews } = createServices();
        const matches = Array.from({ length: 10 }, (_, i) => buildMatchedItem(`logs-${i}`));
        dataViews.getIndices.mockResolvedValue(matches);

        const handler = getIndexSelectionHandler(services, {
          maxResults: 3,
          allowWildcard: true,
        });
        const options = await handler.search('logs-', EMPTY_CONTEXT);

        expect(options.map((o) => o.value)).toEqual(['logs-*', 'logs-0', 'logs-1']);
      });
    });
  });

  describe('resolve', () => {
    it('returns null for empty values without calling the API', async () => {
      const { services, dataViews } = createServices();
      const handler = getIndexSelectionHandler(services);

      await expect(handler.resolve('   ', EMPTY_CONTEXT)).resolves.toBeNull();
      expect(dataViews.getIndices).not.toHaveBeenCalled();
    });

    it('returns the matched item when exactly one source matches the value', async () => {
      const { services, dataViews } = createServices();
      dataViews.getIndices.mockResolvedValue([buildMatchedItem('.alerts-default', 'index')]);

      const handler = getIndexSelectionHandler(services);
      const result = await handler.resolve('.alerts-default', EMPTY_CONTEXT);

      expect(dataViews.getIndices).toHaveBeenCalledWith(
        expect.objectContaining({ pattern: '.alerts-default', showAllIndices: false })
      );
      expect(result).toEqual({ value: '.alerts-default', description: 'Type: Index' });
    });

    it('returns null when the pattern does not match anything', async () => {
      const { services, dataViews } = createServices();
      dataViews.getIndices.mockResolvedValue([]);

      const handler = getIndexSelectionHandler(services);
      await expect(handler.resolve('does-not-exist', EMPTY_CONTEXT)).resolves.toBeNull();
    });

    it('returns null and swallows errors from getIndices', async () => {
      const { services, dataViews } = createServices();
      dataViews.getIndices.mockRejectedValue(new Error('boom'));

      const handler = getIndexSelectionHandler(services);
      await expect(handler.resolve('logs', EMPTY_CONTEXT)).resolves.toBeNull();
    });

    describe('allowWildcard option', () => {
      it('rejects wildcard values by default without calling the API', async () => {
        const { services, dataViews } = createServices();
        const handler = getIndexSelectionHandler(services);

        await expect(handler.resolve('logs-*', EMPTY_CONTEXT)).resolves.toBeNull();
        expect(dataViews.getIndices).not.toHaveBeenCalled();
      });

      it('returns a pattern option when allowWildcard is true and the value matches more than one source', async () => {
        const { services, dataViews } = createServices();
        dataViews.getIndices.mockResolvedValue([
          buildMatchedItem('logs-app-1'),
          buildMatchedItem('logs-app-2'),
        ]);

        const handler = getIndexSelectionHandler(services, { allowWildcard: true });
        const result = await handler.resolve('logs-*', EMPTY_CONTEXT);

        expect(dataViews.getIndices).toHaveBeenCalledWith(
          expect.objectContaining({ pattern: 'logs-*' })
        );
        expect(result?.value).toBe('logs-*');
        expect(result?.description).toMatch(/2 sources/);
      });

      it('still returns a single matched item when allowWildcard is true and only one source matches', async () => {
        const { services, dataViews } = createServices();
        dataViews.getIndices.mockResolvedValue([buildMatchedItem('logs-app-1', 'index')]);

        const handler = getIndexSelectionHandler(services, { allowWildcard: true });
        const result = await handler.resolve('logs-*', EMPTY_CONTEXT);

        expect(result).toEqual({ value: 'logs-app-1', description: 'Type: Index' });
      });
    });
  });

  describe('getDetails', () => {
    it('returns a success message that includes the input and no links when an option was resolved', async () => {
      const { services } = createServices();
      const handler = getIndexSelectionHandler(services);

      const details = await handler.getDetails('logs-app-1', EMPTY_CONTEXT, {
        value: 'logs-app-1',
        description: 'Type: Index',
      });

      expect(details.message).toContain('logs-app-1');
      expect(details.message).toMatch(/exists/);
      expect(details.links).toEqual([]);
    });

    it('returns a warning that includes the input and a deep link to Index Management when not resolved', async () => {
      const { services, getUrlForApp } = createServices();
      const handler = getIndexSelectionHandler(services);

      const details = await handler.getDetails('does-not-exist', EMPTY_CONTEXT, null);

      expect(details.message).toContain('does-not-exist');
      expect(details.message).toMatch(/can still run/);
      expect(getUrlForApp).toHaveBeenCalledWith(
        'management',
        expect.objectContaining({ deepLinkId: 'index_management', absolute: true })
      );
      expect(details.links).toEqual([
        expect.objectContaining({ path: '/app/management/index_management' }),
      ]);
    });

    describe('allowWildcard option', () => {
      it('reports that wildcards are not allowed by default when the input is a wildcard pattern', async () => {
        const { services, getUrlForApp } = createServices();
        const handler = getIndexSelectionHandler(services);

        const details = await handler.getDetails('does-not-exist-*', EMPTY_CONTEXT, null);

        expect(details.message).toMatch(/[Ww]ildcard/);
        expect(details.message).not.toMatch(/can still run/);
        expect(details.links).toEqual([]);
        expect(getUrlForApp).not.toHaveBeenCalled();
      });

      it('falls through to the not-found message and Index Management link when allowWildcard is true', async () => {
        const { services, getUrlForApp } = createServices();
        const handler = getIndexSelectionHandler(services, { allowWildcard: true });

        const details = await handler.getDetails('does-not-exist-*', EMPTY_CONTEXT, null);

        expect(details.message).toContain('does-not-exist-*');
        expect(details.message).toMatch(/can still run/);
        expect(getUrlForApp).toHaveBeenCalledWith(
          'management',
          expect.objectContaining({ deepLinkId: 'index_management' })
        );
      });
    });
  });
});
