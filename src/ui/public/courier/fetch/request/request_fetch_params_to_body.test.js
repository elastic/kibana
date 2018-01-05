import { requestFetchParamsToBody } from './request_fetch_params_to_body';
import _ from 'lodash';

function requestFetchParamsToBodyWithDefaults(paramOverrides) {
  const paramDefaults = {
    requestFetchParams: [],
    Promise,
    timeFilter: {
      getActiveBounds: () => undefined,
    },
    kbnIndex: '.kibana',
    sessionId: '1',
  };
  const params = { ...paramDefaults, ...paramOverrides };

  return requestFetchParamsToBody(
    params.requestFetchParams,
    Promise,
    params.timeFilter,
    params.kbnIndex,
    params.sessionId,
  );
}

test('filters out any body properties that begin with $', () => {
  const requestFetchParams = [
    {
      index: ['logstash-123'],
      type: 'blah',
      search_type: 'blah2',
      body: { foo: 'bar', $foo: 'bar' }
    }
  ];
  return requestFetchParamsToBodyWithDefaults({ requestFetchParams }).then(value => {
    expect(_.includes(value, 'foo')).toBe(true);
    expect(_.includes(value, '$foo')).toBe(false);
  });
});

describe('when indexList is not empty', () => {
  test('includes the index', () => {
    const requestFetchParams = [
      {
        index: ['logstash-123'],
        type: 'blah',
        search_type: 'blah2',
        body: { foo: 'bar', $foo: 'bar' }
      }
    ];
    return requestFetchParamsToBodyWithDefaults({ requestFetchParams }).then(value => {
      expect(_.includes(value, '"index":["logstash-123"]')).toBe(true);
    });
  });
});

describe('when indexList is empty', () => {
  const emptyMustNotQuery = JSON.stringify({
    query: {
      bool: {
        must_not: [
          { match_all: {} }
        ]
      }
    }
  });

  const requestFetchParams = [
    {
      index: [],
      type: 'blah',
      search_type: 'blah2',
      body: { foo: 'bar', $foo: 'bar' }
    }
  ];

  it('queries the kibana index (.kibana) with a must_not match_all boolean', () => {
    return requestFetchParamsToBodyWithDefaults({ requestFetchParams }).then(value => {
      expect(_.includes(value, '"index":[".kibana"]')).toBe(true);
      expect(_.includes(value, emptyMustNotQuery)).toBe(true);
    });
  });
});
