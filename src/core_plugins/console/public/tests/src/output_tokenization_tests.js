let ace = require('ace');
let $ = require('jquery');
let RowParser = require('../../src/sense_editor/row_parser');
import { initializeOutput } from '../../src/output';
let output;

var token_iterator = ace.require("ace/token_iterator");
var { module, asyncTest, deepEqual, start } = window.QUnit;


module("Output Tokenization", {
  setup: function () {
    output = initializeOutput($('#output'));
    output.$el.show();
  },
  teardown: function () {
    output.$el.hide();
  }
});

function tokensAsList() {
  var iter = new token_iterator.TokenIterator(output.getSession(), 0, 0);
  var ret = [];
  var t = iter.getCurrentToken();
  var parser = new RowParser(output);
  if (parser.isEmptyToken(t)) {
    t = parser.nextNonEmptyToken(iter);
  }
  while (t) {
    ret.push({ value: t.value, type: t.type });
    t = parser.nextNonEmptyToken(iter);
  }

  return ret;
}

var testCount = 0;

function token_test(token_list, data) {
  if (data && typeof data != "string") {
    data = JSON.stringify(data, null, 3);
  }

  asyncTest("Token test " + testCount++, function () {
    output.update(data, function () {
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
  ["warning", "#! warning", "comment", "# GET url", "paren.lparen", "{", "paren.rparen", "}"],
  "#! warning\n" +
  "# GET url\n" +
  "{}"
);

token_test(
  [ "comment", "# GET url",
    "paren.lparen", "{",
    "variable", '"f"',
    "punctuation.colon", ":",
    "punctuation.start_triple_quote", '"""',
    "multi_string", "raw",
    "punctuation.end_triple_quote", '"""',
    "paren.rparen", "}"
  ],
  '# GET url\n' +
  '{ "f": """raw""" }'
);
