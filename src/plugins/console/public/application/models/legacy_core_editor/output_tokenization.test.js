/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import './legacy_core_editor.test.mocks';
import $ from 'jquery';
import RowParser from '../../../lib/row_parser';
import ace from 'brace';
import { createReadOnlyAceEditor } from './create_readonly';
let output;
const tokenIterator = ace.acequire('ace/token_iterator');

describe('Output Tokenization', () => {
  beforeEach(() => {
    output = createReadOnlyAceEditor(document.querySelector('#ConAppOutput'));
    $(output.container).show();
  });

  afterEach(() => {
    $(output.container).hide();
  });

  function tokensAsList() {
    const iter = new tokenIterator.TokenIterator(output.getSession(), 0, 0);
    const ret = [];
    let t = iter.getCurrentToken();
    const parser = new RowParser(output);
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

  function tokenTest(tokenList, data) {
    if (data && typeof data !== 'string') {
      data = JSON.stringify(data, null, 3);
    }

    test('Token test ' + testCount++, async function (done) {
      output.update(data, function () {
        const tokens = tokensAsList();
        const normTokenList = [];
        for (let i = 0; i < tokenList.length; i++) {
          normTokenList.push({ type: tokenList[i++], value: tokenList[i] });
        }

        expect(tokens).toEqual(normTokenList);
        done();
      });
    });
  }

  tokenTest(
    ['warning', '#! warning', 'comment', '# GET url', 'paren.lparen', '{', 'paren.rparen', '}'],
    '#! warning\n' + '# GET url\n' + '{}'
  );

  tokenTest(
    [
      'comment',
      '# GET url',
      'paren.lparen',
      '{',
      'variable',
      '"f"',
      'punctuation.colon',
      ':',
      'punctuation.start_triple_quote',
      '"""',
      'multi_string',
      'raw',
      'punctuation.end_triple_quote',
      '"""',
      'paren.rparen',
      '}',
    ],
    '# GET url\n' + '{ "f": """raw""" }'
  );
});
