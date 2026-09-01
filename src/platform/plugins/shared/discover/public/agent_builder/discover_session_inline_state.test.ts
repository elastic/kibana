/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_ESQL_DATA_SOURCE_TYPE } from '@kbn/as-code-data-views-schema';
import { NEW_TAB_ID } from '../../common/constants';
import type { DiscoverSessionApiData, DiscoverSessionApiTab } from '../../server';
import {
  buildDiscoverSessionEmbeddableInput,
  DEFAULT_DISCOVER_SESSION_TIME_RANGE,
  getDiscoverSessionLocatorParams,
  getDiscoverSessionSeedTimeRange,
} from './discover_session_inline_state';

const esqlTab: DiscoverSessionApiTab = {
  id: 'tab-1',
  label: 'Documents',
  data_source: {
    type: AS_CODE_ESQL_DATA_SOURCE_TYPE,
    query: 'FROM logs-* | LIMIT 100',
  },
  hide_chart: true,
  hide_table: false,
  time_range: { from: 'now-24h', to: 'now' },
  column_order: ['@timestamp', 'message'],
  sort: [{ name: '@timestamp', direction: 'desc' }],
};

const createSession = (
  overrides: Partial<DiscoverSessionApiData> & Pick<DiscoverSessionApiData, 'title' | 'tabs'>
): DiscoverSessionApiData => ({
  description: '',
  ...overrides,
});

describe('discover session inline state', () => {
  describe('getDiscoverSessionSeedTimeRange', () => {
    it('prefers mapped attachment time over screen context', () => {
      expect(
        getDiscoverSessionSeedTimeRange({
          mappedTimeRange: { from: 'now-1h', to: 'now' },
          screenContextTimeRange: { from: 'now-7d', to: 'now' },
        })
      ).toEqual({ from: 'now-1h', to: 'now' });
    });

    it('uses screen context when the attachment has no time range', () => {
      expect(
        getDiscoverSessionSeedTimeRange({
          screenContextTimeRange: { from: 'now-7d', to: 'now' },
        })
      ).toEqual({ from: 'now-7d', to: 'now' });
    });

    it('falls back to the default range', () => {
      expect(getDiscoverSessionSeedTimeRange({})).toEqual(DEFAULT_DISCOVER_SESSION_TIME_RANGE);
    });
  });

  describe('buildDiscoverSessionEmbeddableInput', () => {
    it('adds overlay document viewer display options and the local time range', () => {
      const data = createSession({ title: 'Nginx errors', tabs: [esqlTab] });
      const result = buildDiscoverSessionEmbeddableInput(data, { from: 'now-15m', to: 'now' });

      expect(result.time_range).toEqual({ from: 'now-15m', to: 'now' });
      expect(result.nonPersistedDisplayOptions).toEqual({
        enableDocumentViewer: true,
        enableFilters: false,
        documentViewerFlyoutType: 'overlay',
        autoApplyDiscoverColumnDefaults: true,
      });
      expect(result).not.toHaveProperty('attributes');
    });
  });

  describe('getDiscoverSessionLocatorParams', () => {
    it('opens ES|QL in a new Discover tab using picker time', () => {
      const data = createSession({ title: 'Nginx errors', tabs: [esqlTab] });
      const result = getDiscoverSessionLocatorParams({
        data,
        timeRange: { from: 'now-15m', to: 'now' },
      });

      expect(result).toEqual({
        query: { esql: 'FROM logs-* | LIMIT 100' },
        columns: ['@timestamp', 'message'],
        sort: [['@timestamp', 'desc']],
        timeRange: { from: 'now-15m', to: 'now' },
        hideChart: true,
        tab: { id: NEW_TAB_ID, label: 'Nginx errors' },
      });
    });
  });
});
