/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut, EuiPagination } from '@elastic/eui';

import { DocumentList } from './document_list';

import { INDEX_DOCUMENTS_META_DEFAULT } from '../types';
import { Result } from './result/result';

export const DEFAULT_VALUES = {
  dataTelemetryIdPrefix: `entSearchContent-api`,
  docs: [],
  docsPerPage: 25,
  isLoading: true,
  mappings: undefined,
  meta: INDEX_DOCUMENTS_META_DEFAULT,
  onPaginate: () => {},
  setDocsPerPage: () => {},
};

const mockValues = { ...DEFAULT_VALUES };

describe('DocumentList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const mockFn = jest.fn();
    mockFn.mockImplementation(() => Promise.resolve({ ...DEFAULT_VALUES }));
  });
  it('renders empty', () => {
    const wrapper = shallow(<DocumentList {...DEFAULT_VALUES} />);
    expect(wrapper.find(Result)).toHaveLength(0);
    expect(wrapper.find(EuiPagination)).toHaveLength(2);
  });

  it('renders documents when results when there is data and mappings', () => {
    const values = {
      ...DEFAULT_VALUES,
      docs: [
        {
          _id: 'M9ntXoIBTq5dF-1Xnc8A',
          _index: 'kibana_sample_data_flights',
          _score: 1,
          _source: {
            AvgTicketPrice: 268.24159591388866,
          },
        },
        {
          _id: 'NNntXoIBTq5dF-1Xnc8A',
          _index: 'kibana_sample_data_flights',
          _score: 1,
          _source: {
            AvgTicketPrice: 68.91388866,
          },
        },
      ],
      mappings: {
        AvgTicketPrice: {
          type: 'float' as const,
        },
      },
    };

    const wrapper = shallow(<DocumentList {...values} />);
    expect(wrapper.find(Result)).toHaveLength(2);
  });

  it('renders callout when total results are 10.000', () => {
    const values = {
      ...DEFAULT_VALUES,
      ...mockValues,
      meta: {
        ...INDEX_DOCUMENTS_META_DEFAULT,
        totalItemCount: 10000,
      },
    };
    const wrapper = shallow(<DocumentList {...values} />);
    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
  });
});
