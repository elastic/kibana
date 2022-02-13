/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './sense_editor.test.mocks';
import { create } from './create';
import _ from 'lodash';
import $ from 'jquery';

import * as kb from '../../../lib/kb/kb';
import * as mappings from '../../../lib/mappings/mappings';

describe('Integration', () => {
  let senseEditor;
  beforeEach(() => {
    // Set up our document body
    document.body.innerHTML =
      '<div><div id="ConAppEditor" /><div id="ConAppEditorActions" /><div id="ConCopyAsCurl" /></div>';

    senseEditor = create(document.querySelector('#ConAppEditor'));
    $(senseEditor.getCoreEditor().getContainer()).show();
    senseEditor.autocomplete._test.removeChangeListener();
  });
  afterEach(() => {
    $(senseEditor.getCoreEditor().getContainer()).hide();
    senseEditor.autocomplete._test.addChangeListener();
  });

  function processContextTest(data, mapping, kbSchemes, requestLine, testToRun) {
    test(testToRun.name, async function (done) {
      let lineOffset = 0; // add one for the extra method line
      let editorValue = data;
      if (requestLine != null) {
        if (data != null) {
          editorValue = requestLine + '\n' + data;
          lineOffset = 1;
        } else {
          editorValue = requestLine;
        }
      }

      testToRun.cursor.lineNumber += lineOffset;

      mappings.clear();
      mappings.loadMappings(mapping);
      const json = {};
      json[test.name] = kbSchemes || {};
      const testApi = kb._test.loadApisFromJson(json);
      if (kbSchemes) {
        //  if (kbSchemes.globals) {
        //    $.each(kbSchemes.globals, function (parent, rules) {
        //      testApi.addGlobalAutocompleteRules(parent, rules);
        //    });
        //  }
        if (kbSchemes.endpoints) {
          $.each(kbSchemes.endpoints, function (endpoint, scheme) {
            testApi.addEndpointDescription(endpoint, scheme);
          });
        }
      }
      kb.setActiveApi(testApi);
      const { cursor } = testToRun;
      await senseEditor.update(editorValue, true);
      senseEditor.getCoreEditor().moveCursorToPosition(cursor);

      // allow ace rendering to move cursor so it will be seen during test - handy for debugging.
      //setTimeout(function () {
      senseEditor.completer = {
        base: {},
        changeListener: function () {},
      }; // mimic auto complete

      senseEditor.autocomplete._test.getCompletions(
        senseEditor,
        null,
        cursor,
        '',
        function (err, terms) {
          if (testToRun.assertThrows) {
            done();
            return;
          }

          if (err) {
            throw err;
          }

          if (testToRun.no_context) {
            expect(!terms || terms.length === 0).toBeTruthy();
          } else {
            expect(terms).not.toBeNull();
            expect(terms.length).toBeGreaterThan(0);
          }

          if (!terms || terms.length === 0) {
            done();
            return;
          }

          if (testToRun.autoCompleteSet) {
            const expectedTerms = _.map(testToRun.autoCompleteSet, function (t) {
              if (typeof t !== 'object') {
                t = { name: t };
              }
              return t;
            });
            if (terms.length !== expectedTerms.length) {
              expect(_.map(terms, 'name')).toEqual(_.map(expectedTerms, 'name'));
            } else {
              const filteredActualTerms = _.map(terms, function (actualTerm, i) {
                const expectedTerm = expectedTerms[i];
                const filteredTerm = {};
                _.each(expectedTerm, function (v, p) {
                  filteredTerm[p] = actualTerm[p];
                });
                return filteredTerm;
              });
              expect(filteredActualTerms).toEqual(expectedTerms);
            }
          }

          const context = terms[0].context;
          const {
            cursor: { lineNumber, column },
          } = testToRun;
          senseEditor.autocomplete._test.addReplacementInfoToContext(
            context,
            { lineNumber, column },
            terms[0].value
          );

          function ac(prop, propTest) {
            if (typeof testToRun[prop] !== 'undefined') {
              if (propTest) {
                propTest(context[prop], testToRun[prop], prop);
              } else {
                expect(context[prop]).toEqual(testToRun[prop]);
              }
            }
          }

          function posCompare(actual, expected) {
            expect(actual.lineNumber).toEqual(expected.lineNumber + lineOffset);
            expect(actual.column).toEqual(expected.column);
          }

          function rangeCompare(actual, expected, name) {
            posCompare(actual.start, expected.start, name + '.start');
            posCompare(actual.end, expected.end, name + '.end');
          }

          ac('prefixToAdd');
          ac('suffixToAdd');
          ac('addTemplate');
          ac('textBoxPosition', posCompare);
          ac('rangeToReplace', rangeCompare);
          done();
        }
      );
    });
  }

  function contextTests(data, mapping, kbSchemes, requestLine, tests) {
    if (data != null && typeof data !== 'string') {
      data = JSON.stringify(data, null, 3);
    }
    for (let t = 0; t < tests.length; t++) {
      processContextTest(data, mapping, kbSchemes, requestLine, tests[t]);
    }
  }

  const SEARCH_KB = {
    endpoints: {
      _search: {
        methods: ['GET', 'POST'],
        patterns: ['{indices}/_search', '_search'],
        data_autocomplete_rules: {
          query: {
            match_all: {},
            term: { '{field}': { __template: { f: 1 } } },
          },
          size: {},
          facets: {
            __template: {
              FIELD: {},
            },
            '*': { terms: { field: '{field}' } },
          },
        },
      },
    },
  };

  const MAPPING = {
    index1: {
      properties: {
        'field1.1.1': { type: 'string' },
        'field1.1.2': { type: 'string' },
      },
    },
    index2: {
      properties: {
        'field2.1.1': { type: 'string' },
        'field2.1.2': { type: 'string' },
      },
    },
  };

  contextTests({}, MAPPING, SEARCH_KB, 'POST _search', [
    {
      name: 'Empty doc',
      cursor: { lineNumber: 1, column: 2 },
      initialValue: '',
      addTemplate: true,
      prefixToAdd: '',
      suffixToAdd: '',
      rangeToReplace: {
        start: { lineNumber: 1, column: 2 },
        end: { lineNumber: 1, column: 2 },
      },
      autoCompleteSet: ['facets', 'query', 'size'],
    },
  ]);

  contextTests({}, MAPPING, SEARCH_KB, 'POST _no_context', [
    {
      name: 'Missing KB',
      cursor: { lineNumber: 1, column: 2 },
      no_context: true,
    },
  ]);

  contextTests(
    {
      query: {
        f: 1,
      },
    },
    MAPPING,
    {
      globals: {
        query: {
          t1: 2,
        },
      },
      endpoints: {},
    },
    'POST _no_context',
    [
      {
        name: 'Missing KB - global auto complete',
        cursor: { lineNumber: 3, column: 6 },
        autoCompleteSet: ['t1'],
      },
    ]
  );

  contextTests(
    {
      query: {
        field: 'something',
      },
      facets: {},
      size: 20,
    },
    MAPPING,
    SEARCH_KB,
    'POST _search',
    [
      {
        name: 'existing dictionary key, no template',
        cursor: { lineNumber: 2, column: 6 },
        initialValue: 'query',
        addTemplate: false,
        prefixToAdd: '',
        suffixToAdd: '',
        rangeToReplace: {
          start: { lineNumber: 2, column: 4 },
          end: { lineNumber: 2, column: 11 },
        },
        autoCompleteSet: ['facets', 'query', 'size'],
      },
      {
        name: 'existing inner dictionary key',
        cursor: { lineNumber: 3, column: 8 },
        initialValue: 'field',
        addTemplate: false,
        prefixToAdd: '',
        suffixToAdd: '',
        rangeToReplace: {
          start: { lineNumber: 3, column: 7 },
          end: { lineNumber: 3, column: 14 },
        },
        autoCompleteSet: ['match_all', 'term'],
      },
      {
        name: 'existing dictionary key, yes template',
        cursor: { lineNumber: 5, column: 8 },
        initialValue: 'facets',
        addTemplate: true,
        prefixToAdd: '',
        suffixToAdd: '',
        rangeToReplace: {
          start: { lineNumber: 5, column: 4 },
          end: { lineNumber: 5, column: 16 },
        },
        autoCompleteSet: ['facets', 'query', 'size'],
      },
      {
        name: 'ignoring meta keys',
        cursor: { lineNumber: 5, column: 15 },
        no_context: true,
      },
    ]
  );

  contextTests(
    '{\n' +
      '   "query": {\n' +
      '    "field": "something"\n' +
      '   },\n' +
      '   "facets": {},\n' +
      '   "size": 20\n' +
      '}',
    MAPPING,
    SEARCH_KB,
    'POST _search',
    [
      {
        name: 'trailing comma, end of line',
        cursor: { lineNumber: 5, column: 17 },
        initialValue: '',
        addTemplate: true,
        prefixToAdd: '',
        suffixToAdd: ', ',
        rangeToReplace: {
          start: { lineNumber: 5, column: 17 },
          end: { lineNumber: 5, column: 17 },
        },
        autoCompleteSet: ['facets', 'query', 'size'],
      },
      {
        name: 'trailing comma, beginning of line',
        cursor: { lineNumber: 6, column: 2 },
        initialValue: '',
        addTemplate: true,
        prefixToAdd: '',
        suffixToAdd: ', ',
        rangeToReplace: {
          start: { lineNumber: 6, column: 2 },
          end: { lineNumber: 6, column: 2 },
        },
        autoCompleteSet: ['facets', 'query', 'size'],
      },
      {
        name: 'prefix comma, end of line',
        cursor: { lineNumber: 7, column: 1 },
        initialValue: '',
        addTemplate: true,
        prefixToAdd: ',\n',
        suffixToAdd: '',
        rangeToReplace: {
          start: { lineNumber: 6, column: 14 },
          end: { lineNumber: 7, column: 1 },
        },
        autoCompleteSet: ['facets', 'query', 'size'],
      },
    ]
  );

  contextTests(
    {
      object: 1,
      array: 1,
      value_one_of: 1,
      value: 2,
      something_else: 5,
    },
    MAPPING,
    {
      endpoints: {
        _test: {
          patterns: ['_test'],
          data_autocomplete_rules: {
            object: { bla: 1 },
            array: [1],
            value_one_of: { __one_of: [1, 2] },
            value: 3,
            '*': { __one_of: [4, 5] },
          },
        },
      },
    },
    'GET _test',
    [
      {
        name: 'not matching object when { is not opened',
        cursor: { lineNumber: 2, column: 13 },
        initialValue: '',
        autoCompleteSet: ['{'],
      },
      {
        name: 'not matching array when [ is not opened',
        cursor: { lineNumber: 3, column: 13 },
        initialValue: '',
        autoCompleteSet: ['['],
      },
      {
        name: 'matching value with one_of',
        cursor: { lineNumber: 4, column: 20 },
        initialValue: '',
        autoCompleteSet: [1, 2],
      },
      {
        name: 'matching value',
        cursor: { lineNumber: 5, column: 13 },
        initialValue: '',
        autoCompleteSet: [3],
      },
      {
        name: 'matching any value with one_of',
        cursor: { lineNumber: 6, column: 22 },
        initialValue: '',
        autoCompleteSet: [4, 5],
      },
    ]
  );

  contextTests(
    {
      query: {
        field: 'something',
      },
      facets: {
        name: {},
      },
      size: 20,
    },
    MAPPING,
    SEARCH_KB,
    'GET _search',
    [
      {
        name: '* matching everything',
        cursor: { lineNumber: 6, column: 16 },
        initialValue: '',
        addTemplate: true,
        prefixToAdd: '',
        suffixToAdd: '',
        rangeToReplace: {
          start: { lineNumber: 6, column: 16 },
          end: { lineNumber: 6, column: 16 },
        },
        autoCompleteSet: [{ name: 'terms', meta: 'API' }],
      },
    ]
  );

  contextTests(
    {
      index: '123',
    },
    MAPPING,
    {
      endpoints: {
        _test: {
          patterns: ['_test'],
          data_autocomplete_rules: {
            index: '{index}',
          },
        },
      },
    },
    'GET _test',
    [
      {
        name: '{index} matching',
        cursor: { lineNumber: 2, column: 16 },
        autoCompleteSet: [
          { name: 'index1', meta: 'index' },
          { name: 'index2', meta: 'index' },
        ],
      },
    ]
  );

  function tt(term, template, meta) {
    term = { name: term, template: template };
    if (meta) {
      term.meta = meta;
    }
    return term;
  }

  contextTests(
    {
      array: ['a'],
      oneof: '1',
    },
    MAPPING,
    {
      endpoints: {
        _endpoint: {
          patterns: ['_endpoint'],
          data_autocomplete_rules: {
            array: ['a', 'b'],
            number: 1,
            object: {},
            fixed: { __template: { a: 1 } },
            oneof: { __one_of: ['o1', 'o2'] },
          },
        },
      },
    },
    'GET _endpoint',
    [
      {
        name: 'Templates 1',
        cursor: { lineNumber: 2, column: 1 },
        autoCompleteSet: [
          tt('array', []),
          tt('fixed', { a: 1 }),
          tt('number', 1),
          tt('object', {}),
          tt('oneof', 'o1'),
        ],
      },
      {
        name: 'Templates - one off',
        cursor: { lineNumber: 5, column: 13 },
        autoCompleteSet: [tt('o1'), tt('o2')],
      },
    ]
  );

  contextTests(
    {
      string: 'value',
      context: {},
    },
    MAPPING,
    {
      endpoints: {
        _endpoint: {
          patterns: ['_endpoint'],
          data_autocomplete_rules: {
            context: {
              __one_of: [
                {
                  __condition: {
                    lines_regex: 'value',
                  },
                  match: {},
                },
                {
                  __condition: {
                    lines_regex: 'other',
                  },
                  no_match: {},
                },
                { always: {} },
              ],
            },
          },
        },
      },
    },
    'GET _endpoint',
    [
      {
        name: 'Conditionals',
        cursor: { lineNumber: 3, column: 16 },
        autoCompleteSet: [tt('always', {}), tt('match', {})],
      },
    ]
  );

  contextTests(
    {
      any_of_numbers: [1],
      any_of_obj: [
        {
          a: 1,
        },
      ],
      any_of_mixed: [
        {
          a: 1,
        },
        2,
      ],
    },
    MAPPING,
    {
      endpoints: {
        _endpoint: {
          patterns: ['_endpoint'],
          data_autocomplete_rules: {
            any_of_numbers: { __template: [1, 2], __any_of: [1, 2, 3] },
            any_of_obj: {
              __template: [{ c: 1 }],
              __any_of: [{ a: 1, b: 2 }, { c: 1 }],
            },
            any_of_mixed: {
              __any_of: [{ a: 1 }, 3],
            },
          },
        },
      },
    },
    'GET _endpoint',
    [
      {
        name: 'Any of - templates',
        cursor: { lineNumber: 2, column: 1 },
        autoCompleteSet: [
          tt('any_of_mixed', []),
          tt('any_of_numbers', [1, 2]),
          tt('any_of_obj', [{ c: 1 }]),
        ],
      },
      {
        name: 'Any of - numbers',
        cursor: { lineNumber: 3, column: 3 },
        autoCompleteSet: [1, 2, 3],
      },
      {
        name: 'Any of - object',
        cursor: { lineNumber: 7, column: 3 },
        autoCompleteSet: [tt('a', 1), tt('b', 2), tt('c', 1)],
      },
      {
        name: 'Any of - mixed - obj',
        cursor: { lineNumber: 12, column: 3 },
        autoCompleteSet: [tt('a', 1)],
      },
      {
        name: 'Any of - mixed - both',
        cursor: { lineNumber: 14, column: 3 },
        autoCompleteSet: [tt(3), tt('{')],
      },
    ]
  );

  contextTests(
    {},
    MAPPING,
    {
      endpoints: {
        _endpoint: {
          patterns: ['_endpoint'],
          data_autocomplete_rules: {
            query: '',
          },
        },
      },
    },
    'GET _endpoint',
    [
      {
        name: 'Empty string as default',
        cursor: { lineNumber: 1, column: 2 },
        autoCompleteSet: [tt('query', '')],
      },
    ]
  );

  // NOTE: This test emits "error while getting completion terms Error: failed to resolve link
  // [GLOBAL.broken]: Error: failed to resolve global components for  ['broken']". but that's
  // expected.
  contextTests(
    {
      a: {
        b: {},
        c: {},
        d: {
          t1a: {},
        },
        e: {},
        f: [{}],
        g: {},
        h: {},
      },
    },
    MAPPING,
    {
      globals: {
        gtarget: {
          t1: 2,
          t1a: {
            __scope_link: '.',
          },
        },
      },
      endpoints: {
        _current: {
          patterns: ['_current'],
          data_autocomplete_rules: {
            a: {
              b: {
                __scope_link: '.a',
              },
              c: {
                __scope_link: 'ext.target',
              },
              d: {
                __scope_link: 'GLOBAL.gtarget',
              },
              e: {
                __scope_link: 'ext',
              },
              f: [
                {
                  __scope_link: 'ext.target',
                },
              ],
              g: {
                __scope_link: function () {
                  return {
                    a: 1,
                    b: 2,
                  };
                },
              },
              h: {
                __scope_link: 'GLOBAL.broken',
              },
            },
          },
        },
        ext: {
          patterns: ['ext'],
          data_autocomplete_rules: {
            target: {
              t2: 1,
            },
          },
        },
      },
    },
    'GET _current',
    [
      {
        name: 'Relative scope link test',
        cursor: { lineNumber: 3, column: 13 },
        autoCompleteSet: [
          tt('b', {}),
          tt('c', {}),
          tt('d', {}),
          tt('e', {}),
          tt('f', [{}]),
          tt('g', {}),
          tt('h', {}),
        ],
      },
      {
        name: 'External scope link test',
        cursor: { lineNumber: 4, column: 13 },
        autoCompleteSet: [tt('t2', 1)],
      },
      {
        name: 'Global scope link test',
        cursor: { lineNumber: 5, column: 13 },
        autoCompleteSet: [tt('t1', 2), tt('t1a', {})],
      },
      {
        name: 'Global scope link with an internal scope link',
        cursor: { lineNumber: 6, column: 18 },
        autoCompleteSet: [tt('t1', 2), tt('t1a', {})],
      },
      {
        name: 'Entire endpoint scope link test',
        cursor: { lineNumber: 8, column: 13 },
        autoCompleteSet: [tt('target', {})],
      },
      {
        name: 'A scope link within an array',
        cursor: { lineNumber: 10, column: 11 },
        autoCompleteSet: [tt('t2', 1)],
      },
      {
        name: 'A function based scope link',
        cursor: { lineNumber: 12, column: 13 },
        autoCompleteSet: [tt('a', 1), tt('b', 2)],
      },
      {
        name: 'A global scope link with wrong link',
        cursor: { lineNumber: 13, column: 13 },
        assertThrows: /broken/,
      },
    ]
  );

  contextTests(
    {},
    MAPPING,
    {
      globals: {
        gtarget: {
          t1: 2,
        },
      },
      endpoints: {
        _current: {
          patterns: ['_current'],
          id: 'GET _current',
          data_autocomplete_rules: {
            __scope_link: 'GLOBAL.gtarget',
          },
        },
      },
    },
    'GET _current',
    [
      {
        name: 'Top level scope link',
        cursor: { lineNumber: 1, column: 2 },
        autoCompleteSet: [tt('t1', 2)],
      },
    ]
  );

  contextTests(
    {
      a: {},
    },
    MAPPING,
    {
      endpoints: {
        _endpoint: {
          patterns: ['_endpoint'],
          data_autocomplete_rules: {
            a: {},
            b: {},
          },
        },
      },
    },
    'GET _endpoint',
    [
      {
        name: 'Path after empty object',
        cursor: { lineNumber: 2, column: 11 },
        autoCompleteSet: ['a', 'b'],
      },
    ]
  );

  contextTests(
    {
      '': {},
    },
    MAPPING,
    SEARCH_KB,
    'POST _search',
    [
      {
        name: 'Replace an empty string',
        cursor: { lineNumber: 2, column: 5 },
        rangeToReplace: {
          start: { lineNumber: 2, column: 4 },
          end: { lineNumber: 2, column: 10 },
        },
      },
    ]
  );

  contextTests(
    {
      a: [
        {
          c: {},
        },
      ],
    },
    MAPPING,
    {
      endpoints: {
        _endpoint: {
          patterns: ['_endpoint'],
          data_autocomplete_rules: {
            a: [{ b: 1 }],
          },
        },
      },
    },
    'GET _endpoint',
    [
      {
        name: 'List of objects - internal autocomplete',
        cursor: { lineNumber: 4, column: 11 },
        autoCompleteSet: ['b'],
      },
      {
        name: 'List of objects - external template',
        cursor: { lineNumber: 1, column: 2 },
        autoCompleteSet: [tt('a', [{}])],
      },
    ]
  );

  contextTests(
    {
      query: {
        term: {
          field: 'something',
        },
      },
      facets: {
        test: {
          terms: {
            field: 'test',
          },
        },
      },
      size: 20,
    },
    MAPPING,
    SEARCH_KB,
    'POST index1/_search',
    [
      {
        name: 'Field completion as scope',
        cursor: { lineNumber: 4, column: 11 },
        autoCompleteSet: [
          tt('field1.1.1', { f: 1 }, 'string'),
          tt('field1.1.2', { f: 1 }, 'string'),
        ],
      },
      {
        name: 'Field completion as value',
        cursor: { lineNumber: 10, column: 24 },
        autoCompleteSet: [
          { name: 'field1.1.1', meta: 'string' },
          { name: 'field1.1.2', meta: 'string' },
        ],
      },
    ]
  );

  // NOTE: This test emits "Can't extract a valid url token path", but that's expected.
  contextTests('POST _search\n', MAPPING, SEARCH_KB, null, [
    {
      name: 'initial doc start',
      cursor: { lineNumber: 2, column: 1 },
      autoCompleteSet: ['{'],
      prefixToAdd: '',
      suffixToAdd: '',
    },
  ]);

  contextTests(
    '{\n' + '   "query": {} \n' + '}\n' + '\n' + '\n',
    MAPPING,
    SEARCH_KB,
    'POST _search',
    [
      {
        name: 'Cursor rows after request end',
        cursor: { lineNumber: 5, column: 1 },
        autoCompleteSet: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        prefixToAdd: '',
        suffixToAdd: ' ',
      },
      {
        name: 'Cursor just after request end',
        cursor: { lineNumber: 3, column: 2 },
        no_context: true,
      },
    ]
  );

  const CLUSTER_KB = {
    endpoints: {
      _search: {
        patterns: ['_search', '{indices}/_search'],
        url_params: {
          search_type: ['count', 'query_then_fetch'],
          scroll: '10m',
        },
        methods: ['GET'],
        data_autocomplete_rules: {},
      },
      '_cluster/stats': {
        patterns: ['_cluster/stats'],
        indices_mode: 'none',
        data_autocomplete_rules: {},
        methods: ['GET'],
      },
      '_cluster/nodes/stats': {
        patterns: ['_cluster/nodes/stats'],
        data_autocomplete_rules: {},
        methods: ['GET'],
      },
    },
  };

  contextTests(null, MAPPING, CLUSTER_KB, 'GET _cluster', [
    {
      name: 'Endpoints with slashes - no slash',
      cursor: { lineNumber: 1, column: 9 },
      autoCompleteSet: ['_cluster/nodes/stats', '_cluster/stats', '_search', 'index1', 'index2'],
      prefixToAdd: '',
      suffixToAdd: '',
    },
  ]);

  contextTests(null, MAPPING, CLUSTER_KB, 'GET _cluster/', [
    {
      name: 'Endpoints with slashes - before slash',
      cursor: { lineNumber: 1, column: 8 },
      autoCompleteSet: ['_cluster/nodes/stats', '_cluster/stats', '_search', 'index1', 'index2'],
      prefixToAdd: '',
      suffixToAdd: '',
    },
    {
      name: 'Endpoints with slashes - on slash',
      cursor: { lineNumber: 1, column: 13 },
      autoCompleteSet: ['_cluster/nodes/stats', '_cluster/stats', '_search', 'index1', 'index2'],
      prefixToAdd: '',
      suffixToAdd: '',
    },
    {
      name: 'Endpoints with slashes - after slash',
      cursor: { lineNumber: 1, column: 14 },
      autoCompleteSet: ['nodes/stats', 'stats'],
      prefixToAdd: '',
      suffixToAdd: '',
    },
  ]);

  contextTests(null, MAPPING, CLUSTER_KB, 'GET _cluster/no', [
    {
      name: 'Endpoints with slashes - after slash',
      cursor: { lineNumber: 1, column: 15 },
      autoCompleteSet: [
        { name: 'nodes/stats', meta: 'endpoint' },
        { name: 'stats', meta: 'endpoint' },
      ],
      prefixToAdd: '',
      suffixToAdd: '',
      initialValue: 'no',
    },
  ]);

  contextTests(null, MAPPING, CLUSTER_KB, 'GET _cluster/nodes/st', [
    {
      name: 'Endpoints with two slashes',
      cursor: { lineNumber: 1, column: 21 },
      autoCompleteSet: ['stats'],
      prefixToAdd: '',
      suffixToAdd: '',
      initialValue: 'st',
    },
  ]);

  contextTests(null, MAPPING, CLUSTER_KB, 'GET ', [
    {
      name: 'Immediately after space + method',
      cursor: { lineNumber: 1, column: 5 },
      autoCompleteSet: [
        { name: '_cluster/nodes/stats', meta: 'endpoint' },
        { name: '_cluster/stats', meta: 'endpoint' },
        { name: '_search', meta: 'endpoint' },
        { name: 'index1', meta: 'index' },
        { name: 'index2', meta: 'index' },
      ],
      prefixToAdd: '',
      suffixToAdd: '',
      initialValue: '',
    },
  ]);

  contextTests(null, MAPPING, CLUSTER_KB, 'GET cl', [
    {
      name: 'Endpoints by subpart GET',
      cursor: { lineNumber: 1, column: 7 },
      autoCompleteSet: [
        { name: '_cluster/nodes/stats', meta: 'endpoint' },
        { name: '_cluster/stats', meta: 'endpoint' },
        { name: '_search', meta: 'endpoint' },
        { name: 'index1', meta: 'index' },
        { name: 'index2', meta: 'index' },
      ],
      prefixToAdd: '',
      suffixToAdd: '',
      initialValue: 'cl',
      method: 'GET',
    },
  ]);

  contextTests(null, MAPPING, CLUSTER_KB, 'POST cl', [
    {
      name: 'Endpoints by subpart POST',
      cursor: { lineNumber: 1, column: 8 },
      no_context: true,
      prefixToAdd: '',
      suffixToAdd: '',
      initialValue: 'cl',
    },
  ]);

  contextTests(null, MAPPING, CLUSTER_KB, 'GET _search?', [
    {
      name: 'Params just after ?',
      cursor: { lineNumber: 1, column: 13 },
      autoCompleteSet: [
        { name: 'filter_path', meta: 'param', insertValue: 'filter_path=' },
        { name: 'format', meta: 'param', insertValue: 'format=' },
        { name: 'pretty', meta: 'flag' },
        { name: 'scroll', meta: 'param', insertValue: 'scroll=' },
        { name: 'search_type', meta: 'param', insertValue: 'search_type=' },
      ],
      prefixToAdd: '',
      suffixToAdd: '',
    },
  ]);

  contextTests(null, MAPPING, CLUSTER_KB, 'GET _search?format=', [
    {
      name: 'Params values',
      cursor: { lineNumber: 1, column: 20 },
      autoCompleteSet: [
        { name: 'json', meta: 'format' },
        { name: 'yaml', meta: 'format' },
      ],
      prefixToAdd: '',
      suffixToAdd: '',
    },
  ]);

  contextTests(null, MAPPING, CLUSTER_KB, 'GET _search?format=yaml&', [
    {
      name: 'Params after amp',
      cursor: { lineNumber: 1, column: 25 },
      autoCompleteSet: [
        { name: 'filter_path', meta: 'param', insertValue: 'filter_path=' },
        { name: 'format', meta: 'param', insertValue: 'format=' },
        { name: 'pretty', meta: 'flag' },
        { name: 'scroll', meta: 'param', insertValue: 'scroll=' },
        { name: 'search_type', meta: 'param', insertValue: 'search_type=' },
      ],
      prefixToAdd: '',
      suffixToAdd: '',
    },
  ]);

  contextTests(null, MAPPING, CLUSTER_KB, 'GET _search?format=yaml&search', [
    {
      name: 'Params on existing param',
      cursor: { lineNumber: 1, column: 27 },
      rangeToReplace: {
        start: { lineNumber: 1, column: 25 },
        end: { lineNumber: 1, column: 31 },
      },
      autoCompleteSet: [
        { name: 'filter_path', meta: 'param', insertValue: 'filter_path=' },
        { name: 'format', meta: 'param', insertValue: 'format=' },
        { name: 'pretty', meta: 'flag' },
        { name: 'scroll', meta: 'param', insertValue: 'scroll=' },
        { name: 'search_type', meta: 'param', insertValue: 'search_type=' },
      ],
      prefixToAdd: '',
      suffixToAdd: '',
    },
  ]);

  contextTests(null, MAPPING, CLUSTER_KB, 'GET _search?format=yaml&search_type=cou', [
    {
      name: 'Params on existing value',
      cursor: { lineNumber: 1, column: 38 },
      rangeToReplace: {
        start: { lineNumber: 1, column: 37 },
        end: { lineNumber: 1, column: 40 },
      },
      autoCompleteSet: [
        { name: 'count', meta: 'search_type' },
        { name: 'query_then_fetch', meta: 'search_type' },
      ],
      prefixToAdd: '',
      suffixToAdd: '',
    },
  ]);

  contextTests(null, MAPPING, CLUSTER_KB, 'GET _search?format=yaml&search_type=cou', [
    {
      name: 'Params on just after = with existing value',
      cursor: { lineNumber: 1, column: 37 },
      rangeToReplace: {
        start: { lineNumber: 1, column: 37 },
        end: { lineNumber: 1, column: 37 },
      },
      autoCompleteSet: [
        { name: 'count', meta: 'search_type' },
        { name: 'query_then_fetch', meta: 'search_type' },
      ],
      prefixToAdd: '',
      suffixToAdd: '',
    },
  ]);

  contextTests(
    {
      query: {
        field: 'something',
      },
      facets: {},
      size: 20,
    },
    MAPPING,
    SEARCH_KB,
    'POST http://somehost/_search',
    [
      {
        name: 'fullurl - existing dictionary key, no template',
        cursor: { lineNumber: 2, column: 7 },
        initialValue: 'query',
        addTemplate: false,
        prefixToAdd: '',
        suffixToAdd: '',
        rangeToReplace: {
          start: { lineNumber: 2, column: 4 },
          end: { lineNumber: 2, column: 11 },
        },
        autoCompleteSet: ['facets', 'query', 'size'],
      },
      {
        name: 'fullurl - existing inner dictionary key',
        cursor: { lineNumber: 3, column: 8 },
        initialValue: 'field',
        addTemplate: false,
        prefixToAdd: '',
        suffixToAdd: '',
        rangeToReplace: {
          start: { lineNumber: 3, column: 7 },
          end: { lineNumber: 3, column: 14 },
        },
        autoCompleteSet: ['match_all', 'term'],
      },
      {
        name: 'fullurl - existing dictionary key, yes template',
        cursor: { lineNumber: 5, column: 8 },
        initialValue: 'facets',
        addTemplate: true,
        prefixToAdd: '',
        suffixToAdd: '',
        rangeToReplace: {
          start: { lineNumber: 5, column: 4 },
          end: { lineNumber: 5, column: 16 },
        },
        autoCompleteSet: ['facets', 'query', 'size'],
      },
    ]
  );
});
