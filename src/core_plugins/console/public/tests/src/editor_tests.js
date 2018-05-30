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

import $ from 'jquery';
import _ from 'lodash';
const ace = require('ace');
import { initializeInput } from '../../src/input';
const editorInput1 = require('raw-loader!./editor_input1.txt');
const utils = require('../../src/utils');

const aceRange = ace.acequire('ace/range');
const { module, asyncTest, deepEqual, equal, start } = window.QUnit;

let input;

module('Editor', {
  setup: function () {
    input = initializeInput($('#editor'), $('#editor_actions'), $('#copy_as_curl'), null);
    input.$el.show();
    input.autocomplete._test.removeChangeListener();
  },
  teardown: function () {
    input.$el.hide();
    input.autocomplete._test.addChangeListener();
  }
});

let testCount = 0;

function utilsTest(name, prefix, data, test) {
  const id = testCount++;
  if (typeof data === 'function') {
    test = data;
    data = null;
  }
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

  asyncTest('Utils test ' + id + ' : ' + name, function () {
    input.update(data, function () {
      test();
    });
  });
}

function compareRequest(requests, expected) {
  if (!Array.isArray(requests)) {
    requests = [requests];
    expected = [expected];
  }

  _.each(requests, function (r) {
    delete  r.range;
  });
  deepEqual(requests, expected);
}

const  simpleRequest = {
  prefix: 'POST _search',
  data: [
    '{',
    '   "query": { "match_all": {} }',
    '}'
  ].join('\n')
};

const singleLineRequest =
{
  prefix: 'POST _search',
  data: '{ "query": { "match_all": {} } }'
};

const getRequestNoData = {
  prefix: 'GET _stats'
};

const multiDocRequest = {
  prefix: 'POST _bulk',
  data_as_array: [
    '{ "index": { "_index": "index", "_type":"type" } }',
    '{ "field": 1 }'
  ]
};
multiDocRequest.data = multiDocRequest.data_as_array.join('\n');

utilsTest('simple request range',  simpleRequest.prefix,  simpleRequest.data, function () {
  input.getRequestRange(function (range) {
    const expected = new aceRange.Range(
      0, 0,
      3, 1
    );
    compareRequest(range, expected);
    start();
  });
});

utilsTest('simple request data',  simpleRequest.prefix,  simpleRequest.data, function () {
  input.getRequest(function (request) {
    const expected = {
      method: 'POST',
      url: '_search',
      data: [ simpleRequest.data]
    };

    compareRequest(request, expected);
    start();
  });
});

utilsTest('simple request range, prefixed with spaces', '   ' +  simpleRequest.prefix,  simpleRequest.data, function () {
  input.getRequestRange(function (range) {
    const expected = new aceRange.Range(
      0, 0,
      3, 1
    );
    deepEqual(range, expected);
    start();
  });
});

utilsTest('simple request data, prefixed with spaces', '    ' +  simpleRequest.prefix,  simpleRequest.data, function () {
  input.getRequest(function (request) {
    const expected = {
      method: 'POST',
      url: '_search',
      data: [ simpleRequest.data]
    };

    compareRequest(request, expected);
    start();
  });
});

utilsTest('simple request range, suffixed with spaces',  simpleRequest.prefix + '   ',  simpleRequest.data + '  ', function () {
  input.getRequestRange(function (range) {
    const expected = new aceRange.Range(
      0, 0,
      3, 1
    );
    compareRequest(range, expected);
    start();
  });
});

utilsTest('simple request data, suffixed with spaces',  simpleRequest.prefix + '    ',  simpleRequest.data + ' ', function () {
  input.getRequest(function (request) {
    const expected = {
      method: 'POST',
      url: '_search',
      data: [ simpleRequest.data]
    };

    compareRequest(request, expected);
    start();
  });
});


utilsTest('single line request range', singleLineRequest.prefix, singleLineRequest.data, function () {
  input.getRequestRange(function (range) {
    const expected = new aceRange.Range(
      0, 0,
      1, 32
    );
    compareRequest(range, expected);
    start();
  });
});

utilsTest('full url: single line request data', 'POST https://somehoset/_search', singleLineRequest.data, function () {
  input.getRequest(function (request) {
    const expected = {
      method: 'POST',
      url: 'https://somehoset/_search',
      data: [singleLineRequest.data]
    };

    compareRequest(request, expected);
    start();
  });
});

utilsTest('request with no data followed by a new line', getRequestNoData.prefix, '\n', function () {
  input.getRequestRange(function (range) {
    const expected = new aceRange.Range(
      0, 0,
      0, 10
    );
    compareRequest(range, expected);
    start();
  });
});

utilsTest('request with no data followed by a new line (data)', getRequestNoData.prefix, '\n', function () {
  input.getRequest(function (request) {
    const expected = {
      method: 'GET',
      url: '_stats',
      data: []
    };

    compareRequest(request, expected);
    start();
  });
});


utilsTest('request with no data', getRequestNoData.prefix, getRequestNoData.data, function () {
  input.getRequestRange(function (range) {
    const expected = new aceRange.Range(
      0, 0,
      0, 10
    );
    deepEqual(range, expected);
    start();
  });
});

utilsTest('request with no data (data)', getRequestNoData.prefix, getRequestNoData.data, function () {
  input.getRequest(function (request) {
    const expected = {
      method: 'GET',
      url: '_stats',
      data: []
    };

    compareRequest(request, expected);
    start();
  });
});

utilsTest('multi doc request range', multiDocRequest.prefix, multiDocRequest.data, function () {
  input.getRequestRange(function (range) {
    const expected = new aceRange.Range(
      0, 0,
      2, 14
    );
    deepEqual(range, expected);
    start();
  });
});

utilsTest('multi doc request data', multiDocRequest.prefix, multiDocRequest.data, function () {
  input.getRequest(function (request) {
    const expected = {
      method: 'POST',
      url: '_bulk',
      data: multiDocRequest.data_as_array
    };

    compareRequest(request, expected);
    start();
  });
});

const scriptRequest = {
  prefix: 'POST _search',
  data: [
    '{',
    '   "query": { "script": """',
    '   some script ',
    '   """}',
    '}'
  ].join('\n')
};

utilsTest('script request range', scriptRequest.prefix, scriptRequest.data, function () {
  input.getRequestRange(function (range) {
    const expected = new aceRange.Range(
      0, 0,
      5, 1
    );
    compareRequest(range, expected);
    start();
  });
});

utilsTest('simple request data',  simpleRequest.prefix,  simpleRequest.data, function () {
  input.getRequest(function (request) {
    const expected = {
      method: 'POST',
      url: '_search',
      data: [ utils.collapseLiteralStrings(simpleRequest.data) ]
    };

    compareRequest(request, expected);
    start();
  });
});


function multiReqTest(name, editorInput, range, expected) {
  utilsTest('multi request select - ' + name, editorInput, function () {
    input.getRequestsInRange(range, function (requests) {
      // convert to format returned by request.
      _.each(expected, function (req) {
        req.data = req.data == null ? [] : [JSON.stringify(req.data, null, 2)];
      });

      compareRequest(requests, expected);
      start();
    });
  });
}

multiReqTest('mid body to mid body', editorInput1,
  { start: { row: 12 }, end: { row: 17 } }, [{
    method: 'PUT',
    url: 'index_1/type1/1',
    data: {
      'f': 1
    }
  }, {
    method: 'PUT',
    url: 'index_1/type1/2',
    data: {
      'f': 2
    }
  }]);

multiReqTest('single request start to end', editorInput1,
  { start: { row: 10 }, end: { row: 13 } }, [{
    method: 'PUT',
    url: 'index_1/type1/1',
    data: {
      'f': 1
    }
  }]);

multiReqTest('start to end, with comment', editorInput1,
  { start: { row: 6 }, end: { row: 13 } }, [{
    method: 'GET',
    url: '_stats?level=shards',
    data: null
  },
  {
    method: 'PUT',
    url: 'index_1/type1/1',
    data: {
      'f': 1
    }
  }]);

multiReqTest('before start to after end, with comments', editorInput1,
  { start: { row: 4 }, end: { row: 14 } }, [{
    method: 'GET',
    url: '_stats?level=shards',
    data: null
  },
  {
    method: 'PUT',
    url: 'index_1/type1/1',
    data: {
      'f': 1
    }
  }]);

multiReqTest('between requests', editorInput1,
  { start: { row: 21 }, end: { row: 22 } }, []);

multiReqTest('between requests - with comment', editorInput1,
  { start: { row: 20 }, end: { row: 22 } }, []);

multiReqTest('between requests - before comment', editorInput1,
  { start: { row: 19 }, end: { row: 22 } }, []);


function multiReqCopyAsCurlTest(name, editorInput, range, expected) {
  utilsTest('multi request copy as curl - ' + name, editorInput, function () {
    input.getRequestsAsCURL(range, function (curl) {
      equal(curl, expected);
      start();
    });
  });
}


multiReqCopyAsCurlTest('start to end, with comment', editorInput1,
  { start: { row: 6 }, end: { row: 13 } }, `
curl -XGET "http://localhost:9200/_stats?level=shards"

#in between comment

curl -XPUT "http://localhost:9200/index_1/type1/1" -H 'Content-Type: application/json' -d'
{
  "f": 1
}'`.trim()
);
