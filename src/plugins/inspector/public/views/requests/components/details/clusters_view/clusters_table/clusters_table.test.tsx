/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { estypes } from '@elastic/elasticsearch';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClustersTable } from './clusters_table';

describe('ClustersTable', () => {
  describe('sorting', () => {
    const clusters = {
      remote1: {
        status: 'successful',
        took: 50,
      } as unknown as estypes.ClusterDetails,
      remote2: {
        status: 'skipped',
        took: 1000,
      } as unknown as estypes.ClusterDetails,
      remote3: {
        status: 'failed',
        took: 90,
      } as unknown as estypes.ClusterDetails,
    };

    test('should render rows in native order', () => {
      render(<ClustersTable clusters={clusters} />);
      const tableRows = screen.getAllByRole('row');
      expect(tableRows.length).toBe(4); // 1 header row, 3 data rows
      expect(tableRows[1]).toHaveTextContent('remote1successful50ms');
      expect(tableRows[2]).toHaveTextContent('remote2skipped1000ms');
      expect(tableRows[3]).toHaveTextContent('remote3failed90ms');
    });

    test('should sort by response time', () => {
      render(<ClustersTable clusters={clusters} />);
      const button = screen.getByRole('button', {
        name: 'Response time',
      });
      fireEvent.click(button);
      const tableRowsAsc = screen.getAllByRole('row');
      expect(tableRowsAsc.length).toBe(4); // 1 header row, 3 data rows
      expect(tableRowsAsc[1]).toHaveTextContent('remote1successful50ms');
      expect(tableRowsAsc[2]).toHaveTextContent('remote3failed90ms');
      expect(tableRowsAsc[3]).toHaveTextContent('remote2skipped1000ms');

      fireEvent.click(button);
      const tableRowsDesc = screen.getAllByRole('row');
      expect(tableRowsDesc.length).toBe(4); // 1 header row, 3 data rows
      expect(tableRowsDesc[1]).toHaveTextContent('remote2skipped1000ms');
      expect(tableRowsDesc[2]).toHaveTextContent('remote3failed90ms');
      expect(tableRowsDesc[3]).toHaveTextContent('remote1successful50ms');
    });
  });
});
