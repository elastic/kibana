/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
// @ts-ignore
import collapsingTests from './__fixtures__/utils_string_collapsing.txt';
// @ts-ignore
import expandingTests from './__fixtures__/utils_string_expanding.txt';

import * as utils from '.';
import { extractJSONStringValues } from './parser';

describe('JSON to XJSON conversion tools', () => {
  it('will collapse multiline strings', () => {
    const multiline = '{ "foo": """bar\nbaz""" }';
    expect(utils.collapseLiteralStrings(multiline)).toEqual('{ "foo": "bar\\nbaz" }');
  });

  it('will collapse multiline strings with CRLF endings', () => {
    const multiline = '{ "foo": """bar\r\nbaz""" }';
    expect(utils.collapseLiteralStrings(multiline)).toEqual('{ "foo": "bar\\r\\nbaz" }');
  });

  describe('JSON string values parser', () => {
    test('correctly extracts JSON string values', () => {
      const json = {
        myString: 'string',
        notAString: 1,
        myStringArray: ['a', 1, 'test', { nestedString: 'string' }],
      };
      const jsonString = JSON.stringify(json);
      const { stringValues } = extractJSONStringValues(jsonString);
      expect(stringValues.length).toBe(4);

      expect(jsonString.substring(stringValues[0].startIndex, stringValues[0].endIndex + 1)).toBe(
        '"string"'
      );
      expect(jsonString.substring(stringValues[1].startIndex, stringValues[1].endIndex + 1)).toBe(
        '"a"'
      );
      expect(jsonString.substring(stringValues[2].startIndex, stringValues[2].endIndex + 1)).toBe(
        '"test"'
      );
      expect(jsonString.substring(stringValues[3].startIndex, stringValues[3].endIndex + 1)).toBe(
        '"string"'
      );
    });
  });
});

_.each(collapsingTests.split(/^=+$/m), function (fixture) {
  if (fixture.trim() === '') {
    return;
  }
  fixture = fixture.split(/^-+$/m);
  const name = fixture[0].trim();
  const expanded = fixture[1].trim();
  const collapsed = fixture[2].trim();

  test('Literal collapse - ' + name, function () {
    expect(utils.collapseLiteralStrings(expanded)).toEqual(collapsed);
  });
});

_.each(expandingTests.split(/^=+$/m), function (fixture) {
  if (fixture.trim() === '') {
    return;
  }
  fixture = fixture.split(/^-+$/m);
  const name = fixture[0].trim();
  const collapsed = fixture[1].trim();
  const expanded = fixture[2].trim();

  test('Literal expand - ' + name, function () {
    expect(utils.expandLiteralStrings(collapsed)).toEqual(expanded);
  });
});
