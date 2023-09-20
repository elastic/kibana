/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { ClustersView } from './clusters_view';
import { Request } from '../../../../../../common/adapters/request/types';

describe('shouldShow', () => {
  test('should return true when response contains _shards', () => {
    const request = {
      response: {
        json: {
          rawResponse: {
            _shards: {}
          }
        }
      }
    } as unknown as Request;
    expect(ClustersView.shouldShow(request)).toBe(true);
  });

  test('should return true when response contains _clusters', () => {
    const request = {
      response: {
        json: {
          rawResponse: {
            _clusters: {}
          }
        }
      }
    } as unknown as Request;
    expect(ClustersView.shouldShow(request)).toBe(true);
  });

  test('should return false when response does not contains _shards or _clusters', () => {
    const request = {
      response: {
        json: {
          rawResponse: {}
        }
      }
    } as unknown as Request;
    expect(ClustersView.shouldShow(request)).toBe(false);
  });
});

describe('render', () => {
  test('should render local cluster details from _shards', () => {
    const request = {
      response: {
        json: {
          rawResponse: {
            "_shards": {
              "total": 2,
              "successful": 1,
              "skipped": 0,
              "failed": 1,
              "failures": [
                {
                  "shard": 0,
                  "index": ".ds-kibana_sample_data_logs-2023.08.21-000001",
                  "node": "XPQtz28bSLW26Oynf6oUmg",
                  "reason": {
                    "type": "query_shard_exception",
                    "reason": "failed to create query: [.ds-kibana_sample_data_logs-2023.08.21-000001][0] local shard failure message 123",
                    "index_uuid": "Pjkv7r1PQpmhbxaGL-6Chw",
                    "index": ".ds-kibana_sample_data_logs-2023.08.21-000001",
                    "caused_by": {
                      "type": "runtime_exception",
                      "reason": "[.ds-kibana_sample_data_logs-2023.08.21-000001][0] local shard failure message 123"
                    }
                  }
                }
              ]
            },
          }
        }
      }
    } as unknown as Request;
    const wrapper = shallow(<ClustersView request={request} />);
    expect(wrapper).toMatchSnapshot();
  });
  
  test('should render local and remote cluster details from _clusters', () => {
    const request = {
      response: {
        json: {
          rawResponse: {
            "_clusters": {
    "total": 2,
    "successful": 2,
    "skipped": 0,
    "details": {
      "(local)": {
        "status": "successful",
        "indices": "kibana_sample_data_logs,kibana_sample_data_flights",
        "took": 0,
        "timed_out": false,
        "_shards": {
          "total": 2,
          "successful": 2,
          "skipped": 0,
          "failed": 0
        }
      },
      "remote1": {
        "status": "successful",
        "indices": "kibana_sample_data_logs,kibana_sample_data_flights",
        "took": 1,
        "timed_out": false,
        "_shards": {
          "total": 2,
          "successful": 2,
          "skipped": 0,
          "failed": 0
        }
      }
    }
  },
          }
        }
      }
    } as unknown as Request;
    const wrapper = shallow(<ClustersView request={request} />);
    expect(wrapper).toMatchSnapshot();
  });
});