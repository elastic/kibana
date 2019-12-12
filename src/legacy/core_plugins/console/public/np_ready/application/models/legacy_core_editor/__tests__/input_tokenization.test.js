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
import '../legacy_core_editor.test.mocks';
import RowParser from '../../../../lib/row_parser';
import { createTokenIterator } from '../../../factories';
import $ from 'jquery';
import { create } from '../create';

describe('Input Tokenization', () => {
  let coreEditor;
  beforeEach(() => {
    // Set up our document body
    document.body.innerHTML =
      `<div>
        <div id="ConAppEditor" />
        <div id="ConAppEditorActions" />
        <div id="ConCopyAsCurl" />
      </div>`;

    coreEditor = create(document.querySelector('#ConAppEditor'));

    $(coreEditor.getContainer()).show();
  });
  afterEach(() => {
    $(coreEditor.getContainer()).hide();
  });

  function tokensAsList() {
    const iter = createTokenIterator({ editor: coreEditor, position: { lineNumber: 1, column: 1 } });
    const ret = [];
    let t = iter.getCurrentToken();
    const parser = new RowParser(coreEditor);
    if (parser.isEmptyToken(t)) {
      t = parser.nextNonEmptyToken(iter);
    }
    while (t) {
      ret.push({ value: t.value, type: t.type });
      t = parser.nextNonEmptyToken(iter);
    }

    return ret;
  }

  let testCount = 0;

  function tokenTest(tokenList, prefix, data) {
    if (data && typeof data !== 'string') {
      data = JSON.stringify(data, null, 3);
    }
    if (data) {
      if (prefix) {
        data = prefix + '\n' + data;
      }
    }
    else {
      data = prefix;
    }

    test('Token test ' + testCount++ + ' prefix: ' + prefix, async function () {
      await coreEditor.setValue(data, true);
      const tokens = tokensAsList();
      const normTokenList = [];
      for (let i = 0; i < tokenList.length; i++) {
        normTokenList.push({ type: tokenList[i++], value: tokenList[i] });
      }

      expect(tokens).toEqual(normTokenList);
    });
  }

  tokenTest(
    ['method', 'GET', 'url.part', '_search'],
    'GET _search'
  );

  tokenTest(
    ['method', 'GET', 'url.slash', '/', 'url.part', '_search'],
    'GET /_search'
  );

  tokenTest(
    ['method', 'GET', 'url.protocol_host', 'http://somehost', 'url.slash', '/', 'url.part', '_search'],
    'GET http://somehost/_search'
  );

  tokenTest(
    ['method', 'GET', 'url.protocol_host', 'http://somehost'],
    'GET http://somehost'
  );

  tokenTest(
    ['method', 'GET', 'url.protocol_host', 'http://somehost', 'url.slash', '/'],
    'GET http://somehost/'
  );

  tokenTest(
    ['method', 'GET', 'url.protocol_host', 'http://test:user@somehost', 'url.slash', '/'],
    'GET http://test:user@somehost/'
  );

  tokenTest(
    ['method', 'GET', 'url.part', '_cluster', 'url.slash', '/', 'url.part', 'nodes'],
    'GET _cluster/nodes'
  );

  tokenTest(
    ['method', 'GET', 'url.slash', '/', 'url.part', '_cluster', 'url.slash', '/', 'url.part', 'nodes'],
    'GET /_cluster/nodes'
  );


  tokenTest(
    ['method', 'GET', 'url.part', 'index', 'url.slash', '/', 'url.part', '_search'],
    'GET index/_search'
  );

  tokenTest(
    ['method', 'GET', 'url.part', 'index'],
    'GET index'
  );

  tokenTest(
    ['method', 'GET', 'url.part', 'index', 'url.slash', '/', 'url.part', 'type'],
    'GET index/type'
  );

  tokenTest(
    ['method', 'GET', 'url.slash', '/', 'url.part', 'index', 'url.slash', '/', 'url.part', 'type', 'url.slash', '/'],
    'GET /index/type/'
  );

  tokenTest(
    ['method', 'GET', 'url.part', 'index', 'url.slash', '/', 'url.part', 'type', 'url.slash', '/', 'url.part', '_search'],
    'GET index/type/_search'
  );

  tokenTest(
    ['method', 'GET', 'url.part', 'index', 'url.slash', '/', 'url.part', 'type', 'url.slash', '/', 'url.part', '_search',
      'url.questionmark', '?', 'url.param', 'value', 'url.equal', '=', 'url.value', '1'
    ],
    'GET index/type/_search?value=1'
  );


  tokenTest(
    ['method', 'GET', 'url.part', 'index', 'url.slash', '/', 'url.part', 'type', 'url.slash', '/', 'url.part', '1'],
    'GET index/type/1'
  );


  tokenTest(
    ['method', 'GET', 'url.slash', '/', 'url.part', 'index1', 'url.comma', ',', 'url.part', 'index2', 'url.slash', '/'],
    'GET /index1,index2/'
  );

  tokenTest(
    ['method', 'GET', 'url.slash', '/', 'url.part', 'index1', 'url.comma', ',', 'url.part', 'index2', 'url.slash', '/',
      'url.part', '_search'],
    'GET /index1,index2/_search'
  );

  tokenTest(
    ['method', 'GET', 'url.part', 'index1', 'url.comma', ',', 'url.part', 'index2', 'url.slash', '/',
      'url.part', '_search'],
    'GET index1,index2/_search'
  );

  tokenTest(
    ['method', 'GET', 'url.slash', '/', 'url.part', 'index1', 'url.comma', ',', 'url.part', 'index2'],
    'GET /index1,index2'
  );

  tokenTest(
    ['method', 'GET', 'url.part', 'index1', 'url.comma', ',', 'url.part', 'index2'],
    'GET index1,index2'
  );

  tokenTest(
    ['method', 'GET', 'url.slash', '/', 'url.part', 'index1', 'url.comma', ','],
    'GET /index1,'
  );


  tokenTest(
    ['method', 'PUT', 'url.slash', '/', 'url.part', 'index', 'url.slash', '/'],
    'PUT /index/'
  );

  tokenTest(
    ['method', 'GET', 'url.part', 'index', 'url.slash', '/', 'url.part', '_search'],
    'GET index/_search '
  );

  tokenTest(
    ['method', 'PUT', 'url.slash', '/', 'url.part', 'index'],
    'PUT /index'
  );

  tokenTest(
    ['method', 'PUT', 'url.slash', '/', 'url.part', 'index1', 'url.comma', ',', 'url.part', 'index2',
      'url.slash', '/', 'url.part', 'type1', 'url.comma', ',', 'url.part', 'type2'],
    'PUT /index1,index2/type1,type2'
  );

  tokenTest(
    ['method', 'PUT', 'url.slash', '/', 'url.part', 'index1',
      'url.slash', '/', 'url.part', 'type1', 'url.comma', ',', 'url.part', 'type2', 'url.comma', ','],
    'PUT /index1/type1,type2,'
  );

  tokenTest(
    ['method', 'PUT', 'url.part', 'index1', 'url.comma', ',', 'url.part', 'index2',
      'url.slash', '/', 'url.part', 'type1', 'url.comma', ',', 'url.part', 'type2', 'url.slash', '/',
      'url.part', '1234'],
    'PUT index1,index2/type1,type2/1234'
  );


  tokenTest(
    ['method', 'POST', 'url.part', '_search', 'paren.lparen', '{', 'variable', '"q"', 'punctuation.colon', ':',
      'paren.lparen', '{', 'paren.rparen', '}', 'paren.rparen', '}'
    ],
    'POST _search\n' +
  '{\n' +
  '  "q": {}\n' +
  '  \n' +
  '}'
  );

  tokenTest(
    ['method', 'POST', 'url.part', '_search', 'paren.lparen', '{', 'variable', '"q"', 'punctuation.colon', ':',
      'paren.lparen', '{', 'variable', '"s"', 'punctuation.colon', ':', 'paren.lparen', '{', 'paren.rparen', '}',
      'paren.rparen', '}', 'paren.rparen', '}'
    ],
    'POST _search\n' +
  '{\n' +
  '  "q": { "s": {}}\n' +
  '  \n' +
  '}'
  );

  function statesAsList() {
    const ret = [];
    const maxLine = coreEditor.getLineCount();
    for (let line = 1; line <= maxLine; line++) ret.push(coreEditor.getLineState(line));
    return ret;
  }


  function statesTest(statesList, prefix, data) {
    if (data && typeof data !== 'string') {
      data = JSON.stringify(data, null, 3);
    }
    if (data) {
      if (prefix) {
        data = prefix + '\n' + data;
      }
    }
    else {
      data = prefix;
    }

    test('States test ' + testCount++ + ' prefix: ' + prefix, async function () {
      await coreEditor.setValue(data, true);
      const modes = statesAsList();
      expect(modes).toEqual(statesList);
    });
  }


  statesTest(
    ['start', 'json', 'json', 'start'],
    'POST _search\n' +
  '{\n' +
  '  "query": { "match_all": {} }\n' +
  '}'
  );

  statesTest(
    ['start', 'json', ['json', 'json'], ['json', 'json'], 'json', 'start'],
    'POST _search\n' +
  '{\n' +
  '  "query": { \n' +
  '  "match_all": {} \n' +
  '  }\n' +
  '}'
  );

  statesTest(
    ['start', 'json', 'json', 'start'],
    'POST _search\n' +
  '{\n' +
  '  "script": { "source": "" }\n' +
  '}'
  );

  statesTest(
    ['start', 'json', 'json', 'start'],
    'POST _search\n' +
  '{\n' +
  '  "script": ""\n' +
  '}'
  );

  statesTest(
    ['start', 'json', ['json', 'json'], 'json', 'start'],
    'POST _search\n' +
  '{\n' +
  '  "script": {\n' +
  '   }\n' +
  '}'
  );


  statesTest(
    ['start', 'json', ['script-start', 'json', 'json', 'json'], ['script-start', 'json', 'json', 'json'],
      ['json', 'json'], 'json', 'start'],
    'POST _search\n' +
  '{\n' +
  '  "test": { "script": """\n' +
  '  test script\n' +
  ' """\n' +
  ' }\n' +
  '}'
  );

  statesTest(
    ['start', 'json', ['script-start', 'json'], ['script-start', 'json'], 'json', 'start'],
    'POST _search\n' +
  '{\n' +
  '  "script": """\n' +
  '  test script\n' +
  ' """,\n' +
  '}'
  );

  statesTest(
    ['start', 'json', 'json', 'start'],
    'POST _search\n' +
  '{\n' +
  '  "script": """test script""",\n' +
  '}'
  );


  statesTest(
    ['start', 'json', ['string_literal', 'json'], ['string_literal', 'json'], 'json', 'start'],
    'POST _search\n' +
  '{\n' +
  '  "something": """\n' +
  '  test script\n' +
  ' """,\n' +
  '}'
  );

  statesTest(
    ['start', 'json', ['string_literal', 'json', 'json', 'json'], ['string_literal', 'json', 'json', 'json'],
      ['json', 'json'], ['json', 'json'],
      'json', 'start'],
    'POST _search\n' +
  '{\n' +
  '  "something": { "f" : """\n' +
  '  test script\n' +
  ' """,\n' +
  ' "g": 1\n' +
  ' }\n' +
  '}'
  );

  statesTest(
    ['start', 'json', 'json', 'start'],
    'POST _search\n' +
  '{\n' +
  '  "something": """test script""",\n' +
  '}'
  );
});

