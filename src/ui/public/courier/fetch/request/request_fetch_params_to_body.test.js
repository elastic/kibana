import { requestFetchParamsToBody } from './request_fetch_params_to_body';
import _ from 'lodash';

const DEFAULT_SESSION_ID = '1';

function requestFetchParamsToBodyWithDefaults(paramOverrides) {
  const paramDefaults = {
    requestFetchParams: [],
    Promise,
    timeFilter: {
      getActiveBounds: () => undefined,
    },
    kbnIndex: '.kibana',
    sessionId: DEFAULT_SESSION_ID,
    config: {
      get: () => {
        return 'sessionId';
      }
    }
  };
  const params = { ...paramDefaults, ...paramOverrides };

  return requestFetchParamsToBody(
    params.requestFetchParams,
    Promise,
    params.timeFilter,
    params.kbnIndex,
    params.sessionId,
    params.config,
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

  test('queries the kibana index (.kibana) with a must_not match_all boolean', () => {
    return requestFetchParamsToBodyWithDefaults({ requestFetchParams }).then(value => {
      expect(_.includes(value, '"index":[".kibana"]')).toBe(true);
      expect(_.includes(value, emptyMustNotQuery)).toBe(true);
    });
  });
});

describe('headers', () => {

  const requestFetchParams = [
    {
      index: ['logstash-123'],
      type: 'blah',
      search_type: 'blah2',
      body: { foo: 'bar' }
    }
  ];

  const getHeader = async (paramOverrides) => {
    const request = await requestFetchParamsToBodyWithDefaults(paramOverrides);
    const requestParts = request.split('\n');
    if (requestParts.length < 2) {
      throw new Error('fetch Body does not contain expected format header newline body.');
    }
    return JSON.parse(requestParts[0]);
  };

  describe('search request preference', async () => {
    test('should be set to sessionId when courier:setRequestPreference is "sessionId"', async () => {
      const config = {
        get: () => {
          return 'sessionId';
        }
      };
      const header = await getHeader({ requestFetchParams, config });
      expect(header.preference).toBe(DEFAULT_SESSION_ID);
    });

    test('should be set to custom string when courier:setRequestPreference is "custom"', async () => {
      const CUSTOM_PREFERENCE = '_local';
      const config = {
        get: (key) => {
          if (key === 'courier:setRequestPreference') {
            return 'custom';
          } else if (key === 'courier:customRequestPreference') {
            return CUSTOM_PREFERENCE;
          }
        }
      };
      const header = await getHeader({ requestFetchParams, config });
      expect(header.preference).toBe(CUSTOM_PREFERENCE);
    });

    test('should not be set when courier:setRequestPreference is "none"', async () => {
      const config = {
        get: () => {
          return 'none';
        }
      };
      const header = await getHeader({ requestFetchParams, config });
      expect(header.preference).toBe(undefined);
    });
  });
});
