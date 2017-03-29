let ace = require('ace');
let $ = require('jquery');
import { initializeInput } from '../../src/input';
let input;

var token_iterator = ace.require("ace/token_iterator");
var { module, asyncTest, deepEqual, start } = window.QUnit;


module("Input Tokenization", {
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

function tokensAsList() {
  var iter = new token_iterator.TokenIterator(input.getSession(), 0, 0);
  var ret = [];
  var t = iter.getCurrentToken();
  if (input.parser.isEmptyToken(t)) {
    t = input.parser.nextNonEmptyToken(iter);
  }
  while (t) {
    ret.push({ value: t.value, type: t.type });
    t = input.parser.nextNonEmptyToken(iter);
  }

  return ret;
}

var testCount = 0;

function token_test(token_list, prefix, data) {
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
  ["method", "GET", "url.part", "_search"],
  "GET _search"
);

token_test(
  ["method", "GET", "url.slash", "/", "url.part", "_search"],
  "GET /_search"
);

token_test(
  ["method", "GET", "url.protocol_host", "http://somehost", "url.slash", "/", "url.part", "_search"],
  "GET http://somehost/_search"
);

token_test(
  ["method", "GET", "url.protocol_host", "http://somehost"],
  "GET http://somehost"
);

token_test(
  ["method", "GET", "url.protocol_host", "http://somehost", "url.slash", "/"],
  "GET http://somehost/"
);

token_test(
  ["method", "GET", "url.protocol_host", "http://test:user@somehost", "url.slash", "/"],
  "GET http://test:user@somehost/"
);

token_test(
  ["method", "GET", "url.part", "_cluster", "url.slash", "/", "url.part", "nodes"],
  "GET _cluster/nodes"
);

token_test(
  ["method", "GET", "url.slash", "/", "url.part", "_cluster", "url.slash", "/", "url.part", "nodes"],
  "GET /_cluster/nodes"
);


token_test(
  ["method", "GET", "url.part", "index", "url.slash", "/", "url.part", "_search"],
  "GET index/_search"
);

token_test(
  ["method", "GET", "url.part", "index"],
  "GET index"
);

token_test(
  ["method", "GET", "url.part", "index", "url.slash", "/", "url.part", "type"],
  "GET index/type"
);

token_test(
  ["method", "GET", "url.slash", "/", "url.part", "index", "url.slash", "/", "url.part", "type", "url.slash", "/"],
  "GET /index/type/"
);

token_test(
  ["method", "GET", "url.part", "index", "url.slash", "/", "url.part", "type", "url.slash", "/", "url.part", "_search"],
  "GET index/type/_search"
);

token_test(
  ["method", "GET", "url.part", "index", "url.slash", "/", "url.part", "type", "url.slash", "/", "url.part", "_search",
    "url.questionmark", "?", "url.param", "value", "url.equal", "=", "url.value", "1"
  ],
  "GET index/type/_search?value=1"
);


token_test(
  ["method", "GET", "url.part", "index", "url.slash", "/", "url.part", "type", "url.slash", "/", "url.part", "1"],
  "GET index/type/1"
);


token_test(
  ["method", "GET", "url.slash", "/", "url.part", "index1", "url.comma", ",", "url.part", "index2", "url.slash", "/"],
  "GET /index1,index2/"
);

token_test(
  ["method", "GET", "url.slash", "/", "url.part", "index1", "url.comma", ",", "url.part", "index2", "url.slash", "/",
    "url.part", "_search"],
  "GET /index1,index2/_search"
);

token_test(
  ["method", "GET", "url.part", "index1", "url.comma", ",", "url.part", "index2", "url.slash", "/",
    "url.part", "_search"],
  "GET index1,index2/_search"
);

token_test(
  ["method", "GET", "url.slash", "/", "url.part", "index1", "url.comma", ",", "url.part", "index2"],
  "GET /index1,index2"
);

token_test(
  ["method", "GET", "url.part", "index1", "url.comma", ",", "url.part", "index2"],
  "GET index1,index2"
);

token_test(
  ["method", "GET", "url.slash", "/", "url.part", "index1", "url.comma", ","],
  "GET /index1,"
);


token_test(
  ["method", "PUT", "url.slash", "/", "url.part", "index", "url.slash", "/"],
  "PUT /index/"
);

token_test(
  ["method", "GET", "url.part", "index", "url.slash", "/", "url.part", "_search"],
  "GET index/_search "
);

token_test(
  ["method", "PUT", "url.slash", "/", "url.part", "index"],
  "PUT /index"
);

token_test(
  ["method", "PUT", "url.slash", "/", "url.part", "index1", "url.comma", ",", "url.part", "index2",
    "url.slash", "/", "url.part", "type1", "url.comma", ",", "url.part", "type2"],
  "PUT /index1,index2/type1,type2"
);

token_test(
  ["method", "PUT", "url.slash", "/", "url.part", "index1",
    "url.slash", "/", "url.part", "type1", "url.comma", ",", "url.part", "type2", "url.comma", ","],
  "PUT /index1/type1,type2,"
);

token_test(
  ["method", "PUT", "url.part", "index1", "url.comma", ",", "url.part", "index2",
    "url.slash", "/", "url.part", "type1", "url.comma", ",", "url.part", "type2", "url.slash", "/",
    "url.part", "1234"],
  "PUT index1,index2/type1,type2/1234"
);


token_test(
  ["method", "POST", "url.part", "_search", "paren.lparen", "{", "variable", '"q"', "punctuation.colon", ":",
    "paren.lparen", "{", "paren.rparen", "}", "paren.rparen", "}"
  ],
  'POST _search\n' +
  '{\n' +
  '  "q": {}\n' +
  '  \n' +
  '}'
);

token_test(
  ["method", "POST", "url.part", "_search", "paren.lparen", "{", "variable", '"q"', "punctuation.colon", ":",
    "paren.lparen", "{", "variable", '"s"', "punctuation.colon", ":", "paren.lparen", "{", "paren.rparen", "}",
    "paren.rparen", "}", "paren.rparen", "}"
  ],
  'POST _search\n' +
  '{\n' +
  '  "q": { "s": {}}\n' +
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

  asyncTest("States test " + testCount++ + " prefix: " + prefix, function () {
    input.update(data, function () {
      var modes = statesAsList();
      deepEqual(modes, states_list, "Doc:\n" + data);
      start();
    });
  });
}


states_test(
  ["start", "json", "json", "start"],
  'POST _search\n' +
  '{\n' +
  '  "query": { "match_all": {} }\n' +
  '}'
);

states_test(
  ["start", "json", ["json", "json"], ["json", "json"], "json", "start"],
  'POST _search\n' +
  '{\n' +
  '  "query": { \n' +
  '  "match_all": {} \n' +
  '  }\n' +
  '}'
);

states_test(
  ["start", "json", "json", "start"],
  'POST _search\n' +
  '{\n' +
  '  "script": { "inline": "" }\n' +
  '}'
);

states_test(
  ["start", "json", "json", "start"],
  'POST _search\n' +
  '{\n' +
  '  "script": ""\n' +
  '}'
);

states_test(
  ["start", "json", ["json", "json"], "json", "start"],
  'POST _search\n' +
  '{\n' +
  '  "script": {\n' +
  '   }\n' +
  '}'
);


states_test(
  ["start", "json", ["script-start", "json", "json", "json"], ["script-start", "json", "json", "json"],
   ["json", "json"], "json", "start"],
  'POST _search\n' +
  '{\n' +
  '  "test": { "script": """\n' +
  '  test script\n' +
  ' """\n' +
  ' }\n' +
  '}'
);

states_test(
  ["start", "json", ["script-start", "json"], ["script-start", "json"], "json", "start"],
  'POST _search\n' +
  '{\n' +
  '  "script": """\n' +
  '  test script\n' +
  ' """,\n' +
  '}'
);

states_test(
  ["start", "json", "json", "start"],
  'POST _search\n' +
  '{\n' +
  '  "script": """test script""",\n' +
  '}'
);


states_test(
  ["start", "json", ["string_literal", "json"], ["string_literal", "json"], "json", "start"],
  'POST _search\n' +
  '{\n' +
  '  "somthing": """\n' +
  '  test script\n' +
  ' """,\n' +
  '}'
);

states_test(
  ["start", "json", ["string_literal", "json", "json", "json"], ["string_literal", "json", "json", "json"],
  ["json", "json"], ["json", "json"],
  "json", "start"],
  'POST _search\n' +
  '{\n' +
  '  "somthing": { "f" : """\n' +
  '  test script\n' +
  ' """,\n' +
  ' "g": 1\n' +
  ' }\n' +
  '}'
);

states_test(
  ["start", "json", "json", "start"],
  'POST _search\n' +
  '{\n' +
  '  "something": """test script""",\n' +
  '}'
);
