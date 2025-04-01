/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromKueryExpression } from './ast';

describe('kql syntax errors', () => {
  it('should throw an error for a field query missing a value', () => {
    expect(() => {
      fromKueryExpression('response:');
    }).toThrow(
      'Expected "(", "{", value, whitespace but end of input found.\n' +
        'response:\n' +
        '---------^'
    );
  });

  it('should throw an error for an OR query missing a right side sub-query', () => {
    expect(() => {
      fromKueryExpression('response:200 or ');
    }).toThrow(
      'Expected "(", NOT, field name, value but end of input found.\n' +
        'response:200 or \n' +
        '----------------^'
    );
  });

  it('should throw an error for an OR list of values missing a right side sub-query', () => {
    expect(() => {
      fromKueryExpression('response:(200 or )');
    }).toThrow(
      'Expected "(", NOT, value but ")" found.\n' + 'response:(200 or )\n' + '-----------------^'
    );
  });

  it('should throw an error for a NOT query missing a sub-query', () => {
    expect(() => {
      fromKueryExpression('response:200 and not ');
    }).toThrow(
      'Expected "(", field name, value but end of input found.\n' +
        'response:200 and not \n' +
        '---------------------^'
    );
  });

  it('should throw an error for a "missing a sub-query', () => {
    expect(() => {
      fromKueryExpression('response:(200 and not )');
    }).toThrow(
      'Expected "(", value but ")" found.\n' +
        'response:(200 and not )\n' +
        '----------------------^'
    );
  });

  it('should throw an error for unbalanced quotes', () => {
    expect(() => {
      fromKueryExpression('foo:"ba ');
    }).toThrow('Expected "(", "{", value, whitespace but """ found.\n' + 'foo:"ba \n' + '----^');
  });

  it('should throw an error for unescaped quotes in a quoted string', () => {
    expect(() => {
      fromKueryExpression('foo:"ba "r"');
    }).toThrowErrorMatchingInlineSnapshot(`
      "Expected AND, OR, end of input but \\"r\\" found.
      foo:\\"ba \\"r\\"
      ---------^"
    `);
  });

  it('should throw an error for unescaped special characters in literals', () => {
    expect(() => {
      fromKueryExpression('foo:ba:r');
    }).toThrowErrorMatchingInlineSnapshot(`
      "Expected AND, OR, end of input but \\":\\" found.
      foo:ba:r
      ------^"
    `);
  });

  it('should throw an error for range queries missing a value', () => {
    expect(() => {
      fromKueryExpression('foo > ');
    }).toThrow('Expected literal, whitespace but end of input found.\n' + 'foo > \n' + '------^');
  });

  it('should throw an error for range queries missing a field', () => {
    expect(() => {
      fromKueryExpression('< 1000');
    }).toThrow(
      'Expected "(", NOT, end of input, field name, value, whitespace but "<" found.\n' +
        '< 1000\n' +
        '^'
    );
  });
});
