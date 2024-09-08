/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './sense_editor.test.mocks';

import $ from 'jquery';
import _ from 'lodash';
import { URL } from 'url';

import { create } from './create';
import { XJson } from '@kbn/es-ui-shared-plugin/public';
import editorInput1 from './__fixtures__/editor_input1.txt';
import { setStorage, createStorage } from '../../../services';

const { collapseLiteralStrings } = XJson;

describe('Editor', () => {
  let input;
  let oldUrl;
  let olldWindow;
  let storage;

  beforeEach(function () {
    // Set up our document body
    document.body.innerHTML = `<div>
        <div id="ConAppEditor" />
        <div id="ConAppEditorActions" />
        <div id="ConCopyAsCurl" />
      </div>`;

    input = create(document.querySelector('#ConAppEditor'));
    $(input.getCoreEditor().getContainer()).show();
    input.autocomplete._test.removeChangeListener();
    oldUrl = global.URL;
    olldWindow = { ...global.window };
    global.URL = URL;
    Object.defineProperty(global, 'window', {
      value: Object.create(window),
      writable: true,
    });
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:5620',
      },
    });
    storage = createStorage({
      engine: global.window.localStorage,
      prefix: 'console_test',
    });
    setStorage(storage);
  });
  afterEach(function () {
    global.URL = oldUrl;
    global.window = olldWindow;
    $(input.getCoreEditor().getContainer()).hide();
    input.autocomplete._test.addChangeListener();
    setStorage(null);
  });

  let testCount = 0;

  const callWithEditorMethod = (editorMethod, fn) => async (done) => {
    const results = await input[editorMethod]();
    fn(results, done);
  };

  function utilsTest(name, prefix, data, testToRun) {
    const id = testCount++;
    if (typeof data === 'function') {
      testToRun = data;
      data = null;
    }
    if (data && typeof data !== 'string') {
      data = JSON.stringify(data, null, 3);
    }
    if (data) {
      if (prefix) {
        data = prefix + '\n' + data;
      }
    } else {
      data = prefix;
    }

    test('Utils test ' + id + ' : ' + name, function (done) {
      input.update(data, true).then(() => {
        testToRun(done);
      });
    });
  }

  function compareRequest(requests, expected) {
    if (!Array.isArray(requests)) {
      requests = [requests];
      expected = [expected];
    }

    _.each(requests, function (r) {
      delete r.range;
    });
    expect(requests).toEqual(expected);
  }

  const simpleRequest = {
    prefix: 'POST _search',
    data: ['{', '   "query": { "match_all": {} }', '}'].join('\n'),
  };

  const singleLineRequest = {
    prefix: 'POST _search',
    data: '{ "query": { "match_all": {} } }',
  };

  const getRequestNoData = {
    prefix: 'GET _stats',
  };

  const multiDocRequest = {
    prefix: 'POST _bulk',
    data_as_array: ['{ "index": { "_index": "index", "_type":"type" } }', '{ "field": 1 }'],
  };
  multiDocRequest.data = multiDocRequest.data_as_array.join('\n');

  utilsTest(
    'simple request range',
    simpleRequest.prefix,
    simpleRequest.data,
    callWithEditorMethod('getRequestRange', (range, done) => {
      compareRequest(range, {
        start: { lineNumber: 1, column: 1 },
        end: { lineNumber: 4, column: 2 },
      });
      done();
    })
  );

  utilsTest(
    'simple request data',
    simpleRequest.prefix,
    simpleRequest.data,
    callWithEditorMethod('getRequest', (request, done) => {
      const expected = {
        method: 'POST',
        url: '_search',
        data: [simpleRequest.data],
      };
      compareRequest(request, expected);
      done();
    })
  );

  utilsTest(
    'simple request range, prefixed with spaces',
    '   ' + simpleRequest.prefix,
    simpleRequest.data,
    callWithEditorMethod('getRequestRange', (range, done) => {
      expect(range).toEqual({
        start: { lineNumber: 1, column: 1 },
        end: { lineNumber: 4, column: 2 },
      });
      done();
    })
  );

  utilsTest(
    'simple request data, prefixed with spaces',
    '    ' + simpleRequest.prefix,
    simpleRequest.data,
    callWithEditorMethod('getRequest', (request, done) => {
      const expected = {
        method: 'POST',
        url: '_search',
        data: [simpleRequest.data],
      };

      compareRequest(request, expected);
      done();
    })
  );

  utilsTest(
    'simple request range, suffixed with spaces',
    simpleRequest.prefix + '   ',
    simpleRequest.data + '  ',
    callWithEditorMethod('getRequestRange', (range, done) => {
      compareRequest(range, {
        start: { lineNumber: 1, column: 1 },
        end: { lineNumber: 4, column: 2 },
      });
      done();
    })
  );

  utilsTest(
    'simple request data, suffixed with spaces',
    simpleRequest.prefix + '    ',
    simpleRequest.data + ' ',
    callWithEditorMethod('getRequest', (request, done) => {
      const expected = {
        method: 'POST',
        url: '_search',
        data: [simpleRequest.data],
      };

      compareRequest(request, expected);
      done();
    })
  );

  utilsTest(
    'single line request range',
    singleLineRequest.prefix,
    singleLineRequest.data,
    callWithEditorMethod('getRequestRange', (range, done) => {
      compareRequest(range, {
        start: { lineNumber: 1, column: 1 },
        end: { lineNumber: 2, column: 33 },
      });
      done();
    })
  );

  utilsTest(
    'full url: single line request data',
    'POST https://somehost/_search',
    singleLineRequest.data,
    callWithEditorMethod('getRequest', (request, done) => {
      const expected = {
        method: 'POST',
        url: 'https://somehost/_search',
        data: [singleLineRequest.data],
      };
      compareRequest(request, expected);
      done();
    })
  );

  utilsTest(
    'request with no data followed by a new line',
    getRequestNoData.prefix,
    '\n',
    callWithEditorMethod('getRequestRange', (range, done) => {
      compareRequest(range, {
        start: { lineNumber: 1, column: 1 },
        end: { lineNumber: 1, column: 11 },
      });
      done();
    })
  );

  utilsTest(
    'request with no data followed by a new line (data)',
    getRequestNoData.prefix,
    '\n',
    callWithEditorMethod('getRequest', (request, done) => {
      const expected = {
        method: 'GET',
        url: '_stats',
        data: [],
      };
      compareRequest(request, expected);
      done();
    })
  );

  utilsTest(
    'request with no data',
    getRequestNoData.prefix,
    getRequestNoData.data,
    callWithEditorMethod('getRequestRange', (range, done) => {
      expect(range).toEqual({
        start: { lineNumber: 1, column: 1 },
        end: { lineNumber: 1, column: 11 },
      });
      done();
    })
  );

  utilsTest(
    'request with no data (data)',
    getRequestNoData.prefix,
    getRequestNoData.data,
    callWithEditorMethod('getRequest', (request, done) => {
      const expected = {
        method: 'GET',
        url: '_stats',
        data: [],
      };
      compareRequest(request, expected);
      done();
    })
  );

  utilsTest(
    'multi doc request range',
    multiDocRequest.prefix,
    multiDocRequest.data,
    callWithEditorMethod('getRequestRange', (range, done) => {
      expect(range).toEqual({
        start: { lineNumber: 1, column: 1 },
        end: { lineNumber: 3, column: 15 },
      });
      done();
    })
  );

  utilsTest(
    'multi doc request data',
    multiDocRequest.prefix,
    multiDocRequest.data,
    callWithEditorMethod('getRequest', (request, done) => {
      const expected = {
        method: 'POST',
        url: '_bulk',
        data: multiDocRequest.data_as_array,
      };
      compareRequest(request, expected);
      done();
    })
  );

  const scriptRequest = {
    prefix: 'POST _search',
    data: ['{', '   "query": { "script": """', '   some script ', '   """}', '}'].join('\n'),
  };

  utilsTest(
    'script request range',
    scriptRequest.prefix,
    scriptRequest.data,
    callWithEditorMethod('getRequestRange', (range, done) => {
      compareRequest(range, {
        start: { lineNumber: 1, column: 1 },
        end: { lineNumber: 6, column: 2 },
      });
      done();
    })
  );

  utilsTest(
    'simple request data',
    simpleRequest.prefix,
    simpleRequest.data,
    callWithEditorMethod('getRequest', (request, done) => {
      const expected = {
        method: 'POST',
        url: '_search',
        data: [collapseLiteralStrings(simpleRequest.data)],
      };

      compareRequest(request, expected);
      done();
    })
  );

  function multiReqTest(name, editorInput, range, expected) {
    utilsTest('multi request select - ' + name, editorInput, async function (done) {
      const requests = await input.getRequestsInRange(range, false);
      // convert to format returned by request.
      _.each(expected, function (req) {
        req.data = req.data == null ? [] : [JSON.stringify(req.data, null, 2)];
      });

      compareRequest(requests, expected);
      done();
    });
  }

  multiReqTest(
    'mid body to mid body',
    editorInput1,
    { start: { lineNumber: 13 }, end: { lineNumber: 18 } },
    [
      {
        method: 'PUT',
        url: 'index_1/type1/1',
        data: {
          f: 1,
        },
      },
      {
        method: 'PUT',
        url: 'index_1/type1/2',
        data: {
          f: 2,
        },
      },
    ]
  );

  multiReqTest(
    'single request start to end',
    editorInput1,
    { start: { lineNumber: 11 }, end: { lineNumber: 14 } },
    [
      {
        method: 'PUT',
        url: 'index_1/type1/1',
        data: {
          f: 1,
        },
      },
    ]
  );

  multiReqTest(
    'start to end, with comment',
    editorInput1,
    { start: { lineNumber: 7 }, end: { lineNumber: 14 } },
    [
      {
        method: 'GET',
        url: '_stats?level=shards',
        data: null,
      },
      {
        method: 'PUT',
        url: 'index_1/type1/1',
        data: {
          f: 1,
        },
      },
    ]
  );

  multiReqTest(
    'before start to after end, with comments',
    editorInput1,
    { start: { lineNumber: 5 }, end: { lineNumber: 15 } },
    [
      {
        method: 'GET',
        url: '_stats?level=shards',
        data: null,
      },
      {
        method: 'PUT',
        url: 'index_1/type1/1',
        data: {
          f: 1,
        },
      },
    ]
  );

  multiReqTest(
    'between requests',
    editorInput1,
    { start: { lineNumber: 22 }, end: { lineNumber: 23 } },
    []
  );

  multiReqTest(
    'between requests - with comment',
    editorInput1,
    { start: { lineNumber: 21 }, end: { lineNumber: 23 } },
    []
  );

  multiReqTest(
    'between requests - before comment',
    editorInput1,
    { start: { lineNumber: 20 }, end: { lineNumber: 23 } },
    []
  );

  function multiReqCopyAsCurlTest(name, editorInput, range, expected) {
    utilsTest('multi request copy as curl - ' + name, editorInput, async function (done) {
      const curl = await input.getRequestsAsCURL('http://localhost:9200', range);
      expect(curl).toEqual(expected);
      done();
    });
  }

  multiReqCopyAsCurlTest(
    'start to end, with comment',
    editorInput1,
    { start: { lineNumber: 7 }, end: { lineNumber: 14 } },
    `
curl -XGET "http://localhost:9200/_stats?level=shards" -H "kbn-xsrf: reporting"

#in between comment

curl -XPUT "http://localhost:9200/index_1/type1/1" -H "kbn-xsrf: reporting" -H "Content-Type: application/json" -d'
{
  "f": 1
}'`.trim()
  );

  multiReqCopyAsCurlTest(
    'with single quotes',
    editorInput1,
    { start: { lineNumber: 29 }, end: { lineNumber: 33 } },
    `
curl -XPOST "http://localhost:9200/_sql?format=txt" -H "kbn-xsrf: reporting" -H "Content-Type: application/json" -d'
{
  "query": "SELECT prenom FROM claude_index WHERE prenom = '\\''claude'\\'' ",
  "fetch_size": 1
}'`.trim()
  );

  multiReqCopyAsCurlTest(
    'with date math index',
    editorInput1,
    { start: { lineNumber: 35 }, end: { lineNumber: 35 } },
    `
    curl -XGET "http://localhost:9200/%3Cindex_1-%7Bnow%2Fd-2d%7D%3E%2C%3Cindex_1-%7Bnow%2Fd-1d%7D%3E%2C%3Cindex_1-%7Bnow%2Fd%7D%3E%2F_search?pretty" -H "kbn-xsrf: reporting"`.trim()
  );

  multiReqCopyAsCurlTest(
    'with Kibana API request',
    editorInput1,
    { start: { lineNumber: 37 }, end: { lineNumber: 37 } },
    `
curl -XGET "http://localhost:5620/api/spaces/space" -H \"kbn-xsrf: reporting\"`.trim()
  );

  describe('getRequestsAsCURL', () => {
    it('should return empty string if no requests', async () => {
      input?.getCoreEditor().setValue('', false);
      const curl = await input.getRequestsAsCURL('http://localhost:9200', {
        start: { lineNumber: 1 },
        end: { lineNumber: 1 },
      });
      expect(curl).toEqual('');
    });

    it('should replace variables in the URL', async () => {
      storage.set('variables', [{ name: 'exampleVariableA', value: 'valueA' }]);
      input?.getCoreEditor().setValue('GET ${exampleVariableA}', false);
      const curl = await input.getRequestsAsCURL('http://localhost:9200', {
        start: { lineNumber: 1 },
        end: { lineNumber: 1 },
      });
      expect(curl).toContain('valueA');
    });

    it('should replace variables in the body', async () => {
      storage.set('variables', [{ name: 'exampleVariableB', value: 'valueB' }]);
      console.log(storage.get('variables'));
      input
        ?.getCoreEditor()
        .setValue('GET _search\n{\t\t"query": {\n\t\t\t"${exampleVariableB}": ""\n\t}\n}', false);
      const curl = await input.getRequestsAsCURL('http://localhost:9200', {
        start: { lineNumber: 1 },
        end: { lineNumber: 6 },
      });
      expect(curl).toContain('valueB');
    });

    it('should strip comments in the URL', async () => {
      input?.getCoreEditor().setValue('GET _search // comment', false);
      const curl = await input.getRequestsAsCURL('http://localhost:9200', {
        start: { lineNumber: 1 },
        end: { lineNumber: 6 },
      });
      expect(curl).not.toContain('comment');
    });

    it('should strip comments in the body', async () => {
      input
        ?.getCoreEditor()
        .setValue('{\n\t"query": {\n\t\t"match_all": {} // comment \n\t}\n}', false);
      const curl = await input.getRequestsAsCURL('http://localhost:9200', {
        start: { lineNumber: 1 },
        end: { lineNumber: 8 },
      });
      console.log('curl', curl);
      expect(curl).not.toContain('comment');
    });

    it('should strip multi-line comments in the body', async () => {
      input
        ?.getCoreEditor()
        .setValue('{\n\t"query": {\n\t\t"match_all": {} /* comment */\n\t}\n}', false);
      const curl = await input.getRequestsAsCURL('http://localhost:9200', {
        start: { lineNumber: 1 },
        end: { lineNumber: 8 },
      });
      console.log('curl', curl);
      expect(curl).not.toContain('comment');
    });

    it('should replace multiple variables in the URL', async () => {
      storage.set('variables', [
        { name: 'exampleVariableA', value: 'valueA' },
        { name: 'exampleVariableB', value: 'valueB' },
      ]);
      input?.getCoreEditor().setValue('GET ${exampleVariableA}/${exampleVariableB}', false);
      const curl = await input.getRequestsAsCURL('http://localhost:9200', {
        start: { lineNumber: 1 },
        end: { lineNumber: 1 },
      });
      expect(curl).toContain('valueA');
      expect(curl).toContain('valueB');
    });

    it('should replace multiple variables in the body', async () => {
      storage.set('variables', [
        { name: 'exampleVariableA', value: 'valueA' },
        { name: 'exampleVariableB', value: 'valueB' },
      ]);
      input
        ?.getCoreEditor()
        .setValue(
          'GET _search\n{\t\t"query": {\n\t\t\t"${exampleVariableA}": "${exampleVariableB}"\n\t}\n}',
          false
        );
      const curl = await input.getRequestsAsCURL('http://localhost:9200', {
        start: { lineNumber: 1 },
        end: { lineNumber: 6 },
      });
      expect(curl).toContain('valueA');
      expect(curl).toContain('valueB');
    });

    it('should replace variables in bulk request', async () => {
      storage.set('variables', [
        { name: 'exampleVariableA', value: 'valueA' },
        { name: 'exampleVariableB', value: 'valueB' },
      ]);
      input
        ?.getCoreEditor()
        .setValue(
          'POST _bulk\n{"index": {"_id": "0"}}\n{"field" : "${exampleVariableA}"}\n{"index": {"_id": "1"}}\n{"field" : "${exampleVariableB}"}\n',
          false
        );
      const curl = await input.getRequestsAsCURL('http://localhost:9200', {
        start: { lineNumber: 1 },
        end: { lineNumber: 4 },
      });
      expect(curl).toContain('valueA');
      expect(curl).toContain('valueB');
    });
  });
});
