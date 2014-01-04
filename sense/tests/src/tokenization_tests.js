define([
  'ace',
  'input',
  'jquery'
], function (ace, input, $) {
  'use strict';

  module("Tokenization", {
    setup: function () {
      input.$el.show();
    },
    teardown: function () {
      input.$el.hide();
    }
  });

  function tokensAsList() {
    var iter = new (ace.require("ace/token_iterator").TokenIterator)(input.getSession(), 0, 0);
    var ret = [];
    var t = iter.getCurrentToken();
    if (input.parser.isEmptyToken(t)) t = input.parser.nextNonEmptyToken(iter);
    while (t) {
      ret.push({ value: t.value, type: t.type });
      t = input.parser.nextNonEmptyToken(iter);
    }

    return ret;
  }

  var testCount = 0;

  function token_test(token_list, prefix, data) {
    if (data && typeof data != "string") data = JSON.stringify(data, null, 3);
    if (data) {
      if (prefix) data = prefix + "\n" + data;
    } else {
      data = prefix;
    }

    asyncTest("Token test " + testCount++ + " prefix: " + prefix, function () {
      input.update(data, function () {
        var tokens = tokensAsList();
        var normTokenList = [];
        for (var i = 0; i < token_list.length; i++) {
          normTokenList.push({ type: token_list[i++], value: token_list[i] });
        }

        deepEqual(tokens, normTokenList, "Doc:\n" + data);
        start();
      });

    });
  }

  token_test(
    [ "method", "GET", "url.endpoint", "_search" ],
    "GET _search"
  );

  token_test(
    [ "method", "GET", "url.slash", "/", "url.endpoint", "_search" ],
    "GET /_search"
  );


  token_test(
    [ "method", "GET", "url.endpoint", "_cluster", "url.slash", "/", "url.part" , "nodes" ],
    "GET _cluster/nodes"
  );

  token_test(
    [ "method", "GET", "url.slash", "/", "url.endpoint", "_cluster", "url.slash", "/", "url.part" , "nodes" ],
    "GET /_cluster/nodes"
  );


  token_test(
    [ "method", "GET", "url.index", "index", "url.slash", "/", "url.endpoint", "_search" ],
    "GET index/_search"
  );

  token_test(
    [ "method", "GET", "url.index", "index" ],
    "GET index"
  );

  token_test(
    [ "method", "GET", "url.index", "index", "url.slash", "/", "url.type", "type" ],
    "GET index/type"
  );

  token_test(
    [ "method", "GET", "url.slash", "/", "url.index", "index", "url.slash", "/", "url.type", "type", "url.slash", "/" ],
    "GET /index/type/"
  );

  token_test(
    [ "method", "GET", "url.index", "index", "url.slash", "/", "url.type", "type", "url.slash", "/", "url.endpoint", "_search" ],
    "GET index/type/_search"
  );

  token_test(
    [ "method", "GET", "url.index", "index", "url.slash", "/", "url.type", "type", "url.slash", "/", "url.endpoint", "_search",
      "url.questionmark", "?", "url.param", "value", "url.equal", "=", "url.value", "1"
    ],
    "GET index/type/_search?value=1"
  );


  token_test(
    [ "method", "GET", "url.index", "index", "url.slash", "/", "url.type", "type", "url.slash", "/", "url.id", "1" ],
    "GET index/type/1"
  );


  token_test(
    [ "method", "GET", "url.slash", "/", "url.index", "index1", "url.comma", ",", "url.index", "index2", "url.slash", "/" ],
    "GET /index1,index2/"
  );

  token_test(
    [ "method", "GET", "url.slash", "/", "url.index", "index1", "url.comma", ",", "url.index", "index2", "url.slash", "/",
      "url.endpoint", "_search"],
    "GET /index1,index2/_search"
  );

  token_test(
    [ "method", "GET", "url.index", "index1", "url.comma", ",", "url.index", "index2", "url.slash", "/",
      "url.endpoint", "_search"],
    "GET index1,index2/_search"
  );

  token_test(
    [ "method", "GET", "url.slash", "/", "url.index", "index1", "url.comma", ",", "url.index", "index2" ],
    "GET /index1,index2"
  );

  token_test(
    [ "method", "GET", "url.index", "index1", "url.comma", ",", "url.index", "index2" ],
    "GET index1,index2"
  );

  token_test(
    [ "method", "GET", "url.slash", "/", "url.index", "index1", "url.comma", "," ],
    "GET /index1,"
  );


  token_test(
    [ "method", "PUT", "url.slash", "/", "url.index", "index", "url.slash", "/" ],
    "PUT /index/"
  );

  token_test(
    [ "method", "PUT", "url.slash", "/", "url.index", "index" ],
    "PUT /index"
  );

  token_test(
    [ "method", "PUT", "url.slash", "/", "url.index", "index1", "url.comma", ",", "url.index", "index2",
      "url.slash", "/", "url.type", "type1", "url.comma", ",", "url.type", "type2"],
    "PUT /index1,index2/type1,type2"
  );

  token_test(
    [ "method", "PUT", "url.slash", "/", "url.index", "index1",
      "url.slash", "/", "url.type", "type1", "url.comma", ",", "url.type", "type2", "url.comma", ","],
    "PUT /index1/type1,type2,"
  );

  token_test(
    [ "method", "PUT", "url.index", "index1", "url.comma", ",", "url.index", "index2",
      "url.slash", "/", "url.type", "type1", "url.comma", ",", "url.type", "type2", "url.slash", "/",
      "url.id", "1234"],
    "PUT index1,index2/type1,type2/1234"
  );


  token_test(
    [ "method", "POST", "url.endpoint", "_search", "paren.lparen", "{", "variable", '"q"', "punctuation.colon", ":",
      "paren.lparen", "{", "paren.rparen", "}", "paren.rparen", "}"
    ],
    'POST _search\n' +
      '{\n' +
      '  "q": {}\n' +
      '  \n' +
      '}'
  );

  function statesAsList() {
    var ret = [];
    var session = input.getSession();
    var maxLine = session.getLength();
    for (var row = 0; row < maxLine; row++) ret.push(session.getState(row));

    return ret;
  }


  function states_test(states_list, prefix, data) {
    if (data && typeof data != "string") data = JSON.stringify(data, null, 3);
    if (data) {
      if (prefix) data = prefix + "\n" + data;
    } else {
      data = prefix;
    }

    asyncTest("States test " + testCount++ + " prefix: " + prefix, function () {
      input.update(data, function () {
        var modes = statesAsList();
        deepEqual(modes, states_list, "Doc:\n" + data);
        start();
      });
    });
  }


  function n(name) {
    return { name: name};
  }
  function nd(name, depth) {
    return { name: name, depth: depth };
  }

  states_test(
    [n("start"), nd("json", 1), nd("json", 1), nd("start", 0) ],
    'POST _search\n' +
      '{\n' +
      '  "query": { "match_all": {} }\n' +
      '}'
  );
})