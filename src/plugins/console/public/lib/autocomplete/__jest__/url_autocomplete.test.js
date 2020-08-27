/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import {
  URL_PATH_END_MARKER,
  UrlPatternMatcher,
  ListComponent,
} from '../../autocomplete/components';

import { populateContext } from '../../autocomplete/engine';

describe('Url autocomplete', () => {
  function patternsTest(name, endpoints, tokenPath, expectedContext, globalUrlComponentFactories) {
    test(name, function () {
      const patternMatcher = new UrlPatternMatcher(globalUrlComponentFactories);
      _.each(endpoints, function (e, id) {
        e.id = id;
        _.each(e.patterns, function (p) {
          patternMatcher.addEndpoint(p, e);
        });
      });
      if (typeof tokenPath === 'string') {
        if (tokenPath[tokenPath.length - 1] === '$') {
          tokenPath = tokenPath.substr(0, tokenPath.length - 1) + '/' + URL_PATH_END_MARKER;
        }
        tokenPath = _.map(tokenPath.split('/'), function (p) {
          p = p.split(',');
          if (p.length === 1) {
            return p[0];
          }
          return p;
        });
      }

      if (expectedContext.autoCompleteSet) {
        expectedContext.autoCompleteSet = _.map(expectedContext.autoCompleteSet, function (t) {
          if (_.isString(t)) {
            t = { name: t };
          }
          return t;
        });
        expectedContext.autoCompleteSet = _.sortBy(expectedContext.autoCompleteSet, 'name');
      }

      const context = {};
      if (expectedContext.method) {
        context.method = expectedContext.method;
      }
      populateContext(
        tokenPath,
        context,
        null,
        expectedContext.autoCompleteSet,
        patternMatcher.getTopLevelComponents(context.method)
      );

      // override context to just check on id
      if (context.endpoint) {
        context.endpoint = context.endpoint.id;
      }

      if (context.autoCompleteSet) {
        context.autoCompleteSet = _.sortBy(context.autoCompleteSet, 'name');
      }

      expect(context).toEqual(expectedContext);
    });
  }

  function t(name, meta) {
    if (meta) {
      return { name: name, meta: meta };
    }
    return name;
  }

  (function () {
    const endpoints = {
      1: {
        patterns: ['a/b'],
        methods: ['GET'],
      },
    };
    patternsTest('simple single path - completion', endpoints, 'a/b$', {
      endpoint: '1',
      method: 'GET',
    });

    patternsTest('simple single path - completion, with auto complete', endpoints, 'a/b', {
      method: 'GET',
      autoCompleteSet: [],
    });

    patternsTest('simple single path - partial, without auto complete', endpoints, 'a', {});

    patternsTest('simple single path - partial, with auto complete', endpoints, 'a', {
      method: 'GET',
      autoCompleteSet: ['b'],
    });

    patternsTest('simple single path - partial, with auto complete', endpoints, [], {
      method: 'GET',
      autoCompleteSet: ['a/b'],
    });

    patternsTest('simple single path - different path', endpoints, 'a/c', {});
  })();

  (function () {
    const endpoints = {
      1: {
        patterns: ['a/b', 'a/b/{p}'],
        methods: ['GET'],
      },
      2: {
        patterns: ['a/c'],
        methods: ['GET'],
      },
    };
    patternsTest('shared path  - completion 1', endpoints, 'a/b$', {
      endpoint: '1',
      method: 'GET',
    });

    patternsTest('shared path  - completion 2', endpoints, 'a/c$', {
      endpoint: '2',
      method: 'GET',
    });

    patternsTest('shared path  - completion 1 with param', endpoints, 'a/b/v$', {
      method: 'GET',
      endpoint: '1',
      p: 'v',
    });

    patternsTest('shared path - partial, with auto complete', endpoints, 'a', {
      autoCompleteSet: ['b', 'c'],
      method: 'GET',
    });

    patternsTest(
      'shared path - partial, with auto complete of param, no options',
      endpoints,
      'a/b',
      { method: 'GET', autoCompleteSet: [] }
    );

    patternsTest('shared path - partial, without auto complete', endpoints, 'a', { method: 'GET' });

    patternsTest('shared path - different path - with auto complete', endpoints, 'a/e', {
      method: 'GET',
      autoCompleteSet: [],
    });

    patternsTest('shared path - different path - without auto complete', endpoints, 'a/e', {
      method: 'GET',
    });
  })();

  (function () {
    const endpoints = {
      1: {
        patterns: ['a/{p}'],
        url_components: {
          p: ['a', 'b'],
        },
        methods: ['GET'],
      },
      2: {
        patterns: ['a/c'],
        methods: ['GET'],
      },
    };
    patternsTest('option testing - completion 1', endpoints, 'a/a$', {
      method: 'GET',
      endpoint: '1',
      p: ['a'],
    });

    patternsTest('option testing - completion 2', endpoints, 'a/b$', {
      method: 'GET',
      endpoint: '1',
      p: ['b'],
    });

    patternsTest('option testing - completion 3', endpoints, 'a/b,a$', {
      method: 'GET',
      endpoint: '1',
      p: ['b', 'a'],
    });

    patternsTest('option testing - completion 4', endpoints, 'a/c$', {
      method: 'GET',
      endpoint: '2',
    });

    patternsTest('option testing  - completion 5', endpoints, 'a/d$', { method: 'GET' });

    patternsTest('option testing - partial, with auto complete', endpoints, 'a', {
      method: 'GET',
      autoCompleteSet: [t('a', 'p'), t('b', 'p'), 'c'],
    });

    patternsTest('option testing - partial, without auto complete', endpoints, 'a', {
      method: 'GET',
    });

    patternsTest('option testing - different path - with auto complete', endpoints, 'a/e', {
      method: 'GET',
      autoCompleteSet: [],
    });
  })();

  (function () {
    const endpoints = {
      1: {
        patterns: ['a/{p}'],
        url_components: {
          p: ['a', 'b'],
        },
        methods: ['GET'],
      },
      2: {
        patterns: ['b/{p}'],
        methods: ['GET'],
      },
      3: {
        patterns: ['b/{l}/c'],
        methods: ['GET'],
        url_components: {
          l: {
            type: 'list',
            list: ['la', 'lb'],
            allow_non_valid: true,
          },
        },
      },
    };
    const globalFactories = {
      p: function (name, parent) {
        return new ListComponent(name, ['g1', 'g2'], parent);
      },
      getComponent(name) {
        return this[name];
      },
    };

    patternsTest(
      'global parameters testing - completion 1',
      endpoints,
      'a/a$',
      { method: 'GET', endpoint: '1', p: ['a'] },
      globalFactories
    );

    patternsTest(
      'global parameters testing - completion 2',
      endpoints,
      'b/g1$',
      { method: 'GET', endpoint: '2', p: ['g1'] },
      globalFactories
    );

    patternsTest(
      'global parameters testing - partial, with auto complete',
      endpoints,
      'a',
      { method: 'GET', autoCompleteSet: [t('a', 'p'), t('b', 'p')] },
      globalFactories
    );

    patternsTest(
      'global parameters testing - partial, with auto complete 2',
      endpoints,
      'b',
      {
        method: 'GET',
        autoCompleteSet: [t('g1', 'p'), t('g2', 'p'), t('la', 'l'), t('lb', 'l')],
      },
      globalFactories
    );

    patternsTest(
      'Non valid token acceptance - partial, with auto complete 1',
      endpoints,
      'b/la',
      { method: 'GET', autoCompleteSet: ['c'], l: ['la'] },
      globalFactories
    );
    patternsTest(
      'Non valid token acceptance - partial, with auto complete 2',
      endpoints,
      'b/non_valid',
      { method: 'GET', autoCompleteSet: ['c'], l: ['non_valid'] },
      globalFactories
    );
  })();

  (function () {
    const endpoints = {
      1: {
        patterns: ['a/b/{p}/c/e'],
        methods: ['GET'],
      },
    };
    patternsTest('look ahead - autocomplete before param 1', endpoints, 'a', {
      method: 'GET',
      autoCompleteSet: ['b'],
    });

    patternsTest('look ahead - autocomplete before param 2', endpoints, [], {
      method: 'GET',
      autoCompleteSet: ['a/b'],
    });

    patternsTest('look ahead - autocomplete after param 1', endpoints, 'a/b/v', {
      method: 'GET',
      autoCompleteSet: ['c/e'],
      p: 'v',
    });

    patternsTest('look ahead - autocomplete after param 2', endpoints, 'a/b/v/c', {
      method: 'GET',
      autoCompleteSet: ['e'],
      p: 'v',
    });
  })();

  (function () {
    const endpoints = {
      '1_param': {
        patterns: ['a/{p}'],
        methods: ['GET'],
      },
      '2_explicit': {
        patterns: ['a/b'],
        methods: ['GET'],
      },
    };

    let e = _.cloneDeep(endpoints);
    e['1_param'].priority = 1;
    patternsTest('Competing endpoints - priority 1', e, 'a/b$', {
      method: 'GET',
      endpoint: '1_param',
      p: 'b',
    });
    e = _.cloneDeep(endpoints);
    e['1_param'].priority = 1;
    e['2_explicit'].priority = 0;
    patternsTest('Competing endpoints - priority 2', e, 'a/b$', {
      method: 'GET',
      endpoint: '2_explicit',
    });

    e = _.cloneDeep(endpoints);
    e['2_explicit'].priority = 0;
    patternsTest('Competing endpoints - priority 3', e, 'a/b$', {
      method: 'GET',
      endpoint: '2_explicit',
    });
  })();

  (function () {
    const endpoints = {
      '1_GET': {
        patterns: ['a'],
        methods: ['GET'],
      },
      '1_PUT': {
        patterns: ['a'],
        methods: ['PUT'],
      },
      '2_GET': {
        patterns: ['a/b'],
        methods: ['GET'],
      },
      '2_DELETE': {
        patterns: ['a/b'],
        methods: ['DELETE'],
      },
    };
    patternsTest('Competing endpoint - sub url of another - auto complete', endpoints, 'a', {
      method: 'GET',
      autoCompleteSet: ['b'],
    });
    patternsTest('Competing endpoint - sub url of another, complete 1', endpoints, 'a$', {
      method: 'GET',
      endpoint: '1_GET',
    });
    patternsTest('Competing endpoint - sub url of another, complete 2', endpoints, 'a$', {
      method: 'PUT',
      endpoint: '1_PUT',
    });
    patternsTest('Competing endpoint - sub url of another, complete 3', endpoints, 'a$', {
      method: 'DELETE',
    });

    patternsTest(
      'Competing endpoint - extension of another, complete 1, auto complete',
      endpoints,
      'a/b$',
      { method: 'PUT', autoCompleteSet: [] }
    );

    patternsTest('Competing endpoint - extension of another, complete 1', endpoints, 'a/b$', {
      method: 'GET',
      endpoint: '2_GET',
    });

    patternsTest('Competing endpoint - extension of another, complete 1', endpoints, 'a/b$', {
      method: 'DELETE',
      endpoint: '2_DELETE',
    });
    patternsTest('Competing endpoint - extension of another, complete 1', endpoints, 'a/b$', {
      method: 'PUT',
    });
  })();
});
