define([
  'ace',
  'input',
  'jquery'
], function (ace, input, $) {
  'use strict';

  var aceRange = ace.require("ace/range");

  module("Editor", {
    setup: function () {
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
    if (data && typeof data != "string") data = JSON.stringify(data, null, 3);
    if (data) {
      if (prefix) data = prefix + "\n" + data;
    } else {
      data = prefix;
    }

    asyncTest("Utils test " + id + " : " + name, function () {
      input.update(data, function () {
        test();
      });
    });
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
  { prefix: 'POST _search',
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
    input.getCurrentRequestRange(function (range) {
      var expected = new aceRange.Range(
        0, 0,
        3, 1
      );
      deepEqual(range, expected);
      start();
    });
  });

  utils_test("simple request data", simple_request.prefix, simple_request.data, function () {
    input.getCurrentRequest(function (request) {
      var expected = {
        method: "POST",
        url: "_search",
        data: [simple_request.data]
      };

      deepEqual(request, expected);
      start();
    });
  });

  utils_test("single line request range", single_line_request.prefix, single_line_request.data, function () {
    input.getCurrentRequestRange(function (range) {
      var expected = new aceRange.Range(
        0, 0,
        1, 32
      );
      deepEqual(range, expected);
      start();
    });
  });

  utils_test("single line request data", single_line_request.prefix, single_line_request.data, function () {
    input.getCurrentRequest(function (request) {
      var expected = {
        method: "POST",
        url: "_search",
        data: [single_line_request.data]
      };

      deepEqual(request, expected);
      start();
    });
  });

  utils_test("request with no data followed by a new line", get_request_no_data.prefix, "\n", function () {
    input.getCurrentRequestRange(function (range) {
      var expected = new aceRange.Range(
        0, 0,
        0, 10
      );
      deepEqual(range, expected);
      start();
    });
  });

  utils_test("request with no data followed by a new line (data)", get_request_no_data.prefix, "\n", function () {
    input.getCurrentRequest(function (request) {
      var expected = {
        method: "GET",
        url: "_stats",
        data: []
      };

      deepEqual(request, expected);
      start();
    });
  });


  utils_test("request with no data", get_request_no_data.prefix, get_request_no_data.data, function () {
    input.getCurrentRequestRange(function (range) {
      var expected = new aceRange.Range(
        0, 0,
        0, 10
      );
      deepEqual(range, expected);
      start();
    });
  });

  utils_test("request with no data (data)", get_request_no_data.prefix, get_request_no_data.data, function () {
    input.getCurrentRequest(function (range) {
      var expected = {
        method: "GET",
        url: "_stats",
        data: []
      };

      deepEqual(range, expected);
      start();
    });
  });

  utils_test("multi doc request range", multi_doc_request.prefix, multi_doc_request.data, function () {
    input.getCurrentRequestRange(function (range) {
      var expected = new aceRange.Range(
        0, 0,
        2, 14
      );
      deepEqual(range, expected);
      start();
    });
  });

  utils_test("multi doc request data", multi_doc_request.prefix, multi_doc_request.data, function () {
    input.getCurrentRequest(function (request) {
      var expected = {
        method: "POST",
        url: "_bulk",
        data: multi_doc_request.data_as_array
      };

      deepEqual(request, expected);
      start();
    });
  });
})