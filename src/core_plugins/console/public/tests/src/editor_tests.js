import $ from 'jquery';
import _ from 'lodash';
let ace = require('ace');
import { initializeInput } from '../../src/input';
let editor_input1 = require('raw!./editor_input1.txt');
let utils = require('../../src/utils');

var aceRange = ace.require("ace/range");
var { module, asyncTest, deepEqual, equal, start } = window.QUnit;

let input;

module("Editor", {
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

var testCount = 0;

function utils_test(name, prefix, data, test) {
  var id = testCount++;
  if (typeof data == "function") {
    test = data;
    data = null;
  }
  if (data && typeof data != "string") {
    data = JSON.stringify(data, null, 3);
  }
  if (data) {
    if (prefix) {
      data = prefix + "\n" + data;
    }
  }
  else {
    data = prefix;
  }

  asyncTest("Utils test " + id + " : " + name, function () {
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
    delete  r.range
  });
  deepEqual(requests, expected);
}

var simple_request = {
  prefix: 'POST _search',
  data: [
    '{',
    '   "query": { "match_all": {} }',
    '}'
  ].join('\n')
};

var single_line_request =
{
  prefix: 'POST _search',
  data: '{ "query": { "match_all": {} } }'
};

var get_request_no_data = {
  prefix: 'GET _stats'
};

var multi_doc_request = {
  prefix: 'POST _bulk',
  data_as_array: [
    '{ "index": { "_index": "index", "_type":"type" } }',
    '{ "field": 1 }'
  ]
};
multi_doc_request.data = multi_doc_request.data_as_array.join("\n");

utils_test("simple request range", simple_request.prefix, simple_request.data, function () {
  input.getRequestRange(function (range) {
    var expected = new aceRange.Range(
      0, 0,
      3, 1
    );
    compareRequest(range, expected);
    start();
  });
});

utils_test("simple request data", simple_request.prefix, simple_request.data, function () {
  input.getRequest(function (request) {
    var expected = {
      method: "POST",
      url: "_search",
      data: [simple_request.data]
    };

    compareRequest(request, expected);
    start();
  });
});

utils_test("simple request range, prefixed with spaces", "   " + simple_request.prefix, simple_request.data, function () {
  input.getRequestRange(function (range) {
    var expected = new aceRange.Range(
      0, 0,
      3, 1
    );
    deepEqual(range, expected);
    start();
  });
});

utils_test("simple request data, prefixed with spaces", "    " + simple_request.prefix, simple_request.data, function () {
  input.getRequest(function (request) {
    var expected = {
      method: "POST",
      url: "_search",
      data: [simple_request.data]
    };

    compareRequest(request, expected);
    start();
  });
});

utils_test("simple request range, suffixed with spaces", simple_request.prefix + "   ", simple_request.data + "  ", function () {
  input.getRequestRange(function (range) {
    var expected = new aceRange.Range(
      0, 0,
      3, 1
    );
    compareRequest(range, expected);
    start();
  });
});

utils_test("simple request data, suffixed with spaces", simple_request.prefix + "    ", simple_request.data + " ", function () {
  input.getRequest(function (request) {
    var expected = {
      method: "POST",
      url: "_search",
      data: [simple_request.data]
    };

    compareRequest(request, expected);
    start();
  });
});


utils_test("single line request range", single_line_request.prefix, single_line_request.data, function () {
  input.getRequestRange(function (range) {
    var expected = new aceRange.Range(
      0, 0,
      1, 32
    );
    compareRequest(range, expected);
    start();
  });
});

utils_test("full url: single line request data", "POST https://somehoset/_search", single_line_request.data, function () {
  input.getRequest(function (request) {
    var expected = {
      method: "POST",
      url: "https://somehoset/_search",
      data: [single_line_request.data]
    };

    compareRequest(request, expected);
    start();
  });
});

utils_test("request with no data followed by a new line", get_request_no_data.prefix, "\n", function () {
  input.getRequestRange(function (range) {
    var expected = new aceRange.Range(
      0, 0,
      0, 10
    );
    compareRequest(range, expected);
    start();
  });
});

utils_test("request with no data followed by a new line (data)", get_request_no_data.prefix, "\n", function () {
  input.getRequest(function (request) {
    var expected = {
      method: "GET",
      url: "_stats",
      data: []
    };

    compareRequest(request, expected);
    start();
  });
});


utils_test("request with no data", get_request_no_data.prefix, get_request_no_data.data, function () {
  input.getRequestRange(function (range) {
    var expected = new aceRange.Range(
      0, 0,
      0, 10
    );
    deepEqual(range, expected);
    start();
  });
});

utils_test("request with no data (data)", get_request_no_data.prefix, get_request_no_data.data, function () {
  input.getRequest(function (request) {
    var expected = {
      method: "GET",
      url: "_stats",
      data: []
    };

    compareRequest(request, expected);
    start();
  });
});

utils_test("multi doc request range", multi_doc_request.prefix, multi_doc_request.data, function () {
  input.getRequestRange(function (range) {
    var expected = new aceRange.Range(
      0, 0,
      2, 14
    );
    deepEqual(range, expected);
    start();
  });
});

utils_test("multi doc request data", multi_doc_request.prefix, multi_doc_request.data, function () {
  input.getRequest(function (request) {
    var expected = {
      method: "POST",
      url: "_bulk",
      data: multi_doc_request.data_as_array
    };

    compareRequest(request, expected);
    start();
  });
});

var script_request = {
  prefix: 'POST _search',
  data: [
    '{',
    '   "query": { "script": """',
    '   some script ',
    '   """}',
    '}'
  ].join('\n')
};

utils_test("script request range", script_request.prefix, script_request.data, function () {
  input.getRequestRange(function (range) {
    var expected = new aceRange.Range(
      0, 0,
      5, 1
    );
    compareRequest(range, expected);
    start();
  });
});

utils_test("simple request data", simple_request.prefix, simple_request.data, function () {
  input.getRequest(function (request) {
    var expected = {
      method: "POST",
      url: "_search",
      data: [utils.collapseLiteralStrings(simple_request.data)]
    };

    compareRequest(request, expected);
    start();
  });
});


function multi_req_test(name, editor_input, range, expected) {
  utils_test("multi request select - " + name, editor_input, function () {
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

multi_req_test("mid body to mid body", editor_input1,
  { start: { row: 12 }, end: { row: 17 } }, [{
    method: "PUT",
    url: "index_1/type1/1",
    data: {
      "f": 1
    }
  }, {
    method: "PUT",
    url: "index_1/type1/2",
    data: {
      "f": 2
    }
  }]);

multi_req_test("single request start to end", editor_input1,
  { start: { row: 10 }, end: { row: 13 } }, [{
    method: "PUT",
    url: "index_1/type1/1",
    data: {
      "f": 1
    }
  }]);

multi_req_test("start to end, with comment", editor_input1,
  { start: { row: 6 }, end: { row: 13 } }, [{
    method: "GET",
    url: "_stats?level=shards",
    data: null
  },
    {
      method: "PUT",
      url: "index_1/type1/1",
      data: {
        "f": 1
      }
    }]);

multi_req_test("before start to after end, with comments", editor_input1,
  { start: { row: 4 }, end: { row: 14 } }, [{
    method: "GET",
    url: "_stats?level=shards",
    data: null
  },
    {
      method: "PUT",
      url: "index_1/type1/1",
      data: {
        "f": 1
      }
    }]);

multi_req_test("between requests", editor_input1,
  { start: { row: 21 }, end: { row: 22 } }, []);

multi_req_test("between requests - with comment", editor_input1,
  { start: { row: 20 }, end: { row: 22 } }, []);

multi_req_test("between requests - before comment", editor_input1,
  { start: { row: 19 }, end: { row: 22 } }, []);


function multi_req_copy_as_curl_test(name, editor_input, range, expected) {
  utils_test("multi request copy as curl - " + name, editor_input, function () {
    input.getRequestsAsCURL(range, function (curl) {
      equal(curl, expected);
      start();
    });
  });
}


multi_req_copy_as_curl_test("start to end, with comment", editor_input1,
  { start: { row: 6 }, end: { row: 13 } }, `
curl -XGET "http://localhost:9200/_stats?level=shards"

#in between comment

curl -XPUT "http://localhost:9200/index_1/type1/1" -H 'Content-Type: application/json' -d'
{
  "f": 1
}'`.trim()
);
