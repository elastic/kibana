/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClustersView } from './clusters_view';
import { Request } from '../../../../../../common/adapters/request/types';

describe('shouldShow', () => {
  test('should return true when response contains _shards', () => {
    const request = {
      response: {
        json: {
          rawResponse: {
            _shards: {},
          },
        },
      },
    } as unknown as Request;
    expect(ClustersView.shouldShow(request)).toBe(true);
  });

  test('should return true when response contains _clusters', () => {
    const request = {
      response: {
        json: {
          rawResponse: {
            _clusters: {},
          },
        },
      },
    } as unknown as Request;
    expect(ClustersView.shouldShow(request)).toBe(true);
  });

  test('should return false when response does not contains _shards or _clusters', () => {
    const request = {
      response: {
        json: {
          rawResponse: {},
        },
      },
    } as unknown as Request;
    expect(ClustersView.shouldShow(request)).toBe(false);
  });
});

describe('render', () => {
  describe('single cluster', () => {
    test('should display table and not display search bar and health bar', () => {
      const request = {
        response: {
          json: {
            rawResponse: {
              _shards: {
                total: 2,
                successful: 2,
                skipped: 0,
                failed: 0,
              },
            },
          },
        },
      } as unknown as Request;
      render(<ClustersView request={request} />);
      const table = screen.getByRole('table');
      expect(table).not.toBeNull();
      const searchbar = screen.queryByRole('searchbox');
      expect(searchbar).toBeNull();
      const healthbar = screen.queryByText('2 clusters');
      expect(healthbar).toBeNull();
    });
  });

  describe('multiple clusters', () => {
    const request = {
      response: {
        json: {
          rawResponse: {
            _clusters: {
              total: 2,
              successful: 2,
              skipped: 0,
              details: {
                '(local)': {
                  status: 'successful',
                  indices: 'kibana_sample_data_logs,kibana_sample_data_flights',
                  took: 0,
                  timed_out: false,
                  _shards: {
                    total: 2,
                    successful: 2,
                    skipped: 0,
                    failed: 0,
                  },
                },
                remote1: {
                  status: 'successful',
                  indices: 'kibana_sample_data_logs,kibana_sample_data_flights',
                  took: 1,
                  timed_out: false,
                  _shards: {
                    total: 2,
                    successful: 2,
                    skipped: 0,
                    failed: 0,
                  },
                },
              },
            },
          },
        },
      },
    } as unknown as Request;

    test('should display table, search bar, and health bar', () => {
      render(<ClustersView request={request} />);
      const table = screen.getByRole('table');
      expect(table).not.toBeNull();
      const searchbar = screen.getByRole('searchbox');
      expect(searchbar).not.toBeNull();
      const healthbar = screen.getByText('2 clusters');
      expect(healthbar).not.toBeNull();
    });

    test('should filter table and health bar', () => {
      render(<ClustersView request={request} />);
      const searchbar = screen.getByRole('searchbox');
      fireEvent.change(searchbar, { target: { value: 'remot' } });
      const tableRows = screen.getAllByRole('row');
      expect(tableRows.length).toBe(2); // table header and matching table row
      const healthbar = screen.getByText('1 cluster');
      expect(healthbar).not.toBeNull();
    });

    test('should display search bar when there are no matches for search', () => {
      render(<ClustersView request={request} />);
      const searchbar = screen.getByRole('searchbox');
      fireEvent.change(searchbar, { target: { value: 'nevergonafindme' } });
      const notFoundRow = screen.getByRole('row', { name: 'No clusters found' });
      expect(notFoundRow).not.toBeNull();
      const searchbarAfterSearch = screen.getByRole('searchbox');
      expect(searchbarAfterSearch).not.toBeNull();
    });
  });
});
