"use strict";

var _ast = require("../ast");

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
describe('kql syntax errors', () => {
  it('should throw an error for a field query missing a value', () => {
    expect(() => {
      (0, _ast.fromKueryExpression)('response:');
    }).toThrow('Expected "(", value, whitespace but end of input found.\n' + 'response:\n' + '---------^');
  });
  it('should throw an error for an OR query missing a right side sub-query', () => {
    expect(() => {
      (0, _ast.fromKueryExpression)('response:200 or ');
    }).toThrow('Expected "(", NOT, field name, value but end of input found.\n' + 'response:200 or \n' + '----------------^');
  });
  it('should throw an error for an OR list of values missing a right side sub-query', () => {
    expect(() => {
      (0, _ast.fromKueryExpression)('response:(200 or )');
    }).toThrow('Expected "(", NOT, value but ")" found.\n' + 'response:(200 or )\n' + '-----------------^');
  });
  it('should throw an error for a NOT query missing a sub-query', () => {
    expect(() => {
      (0, _ast.fromKueryExpression)('response:200 and not ');
    }).toThrow('Expected "(", field name, value but end of input found.\n' + 'response:200 and not \n' + '---------------------^');
  });
  it('should throw an error for a NOT list missing a sub-query', () => {
    expect(() => {
      (0, _ast.fromKueryExpression)('response:(200 and not )');
    }).toThrow('Expected "(", value but ")" found.\n' + 'response:(200 and not )\n' + '----------------------^');
  });
  it('should throw an error for unbalanced quotes', () => {
    expect(() => {
      (0, _ast.fromKueryExpression)('foo:"ba ');
    }).toThrow('Expected "(", value, whitespace but "\"" found.\n' + 'foo:"ba \n' + '----^');
  });
  it('should throw an error for unescaped quotes in a quoted string', () => {
    expect(() => {
      (0, _ast.fromKueryExpression)('foo:"ba "r"');
    }).toThrow('Expected AND, OR, end of input, whitespace but "r" found.\n' + 'foo:"ba "r"\n' + '---------^');
  });
  it('should throw an error for unescaped special characters in literals', () => {
    expect(() => {
      (0, _ast.fromKueryExpression)('foo:ba:r');
    }).toThrow('Expected AND, OR, end of input, whitespace but ":" found.\n' + 'foo:ba:r\n' + '------^');
  });
  it('should throw an error for range queries missing a value', () => {
    expect(() => {
      (0, _ast.fromKueryExpression)('foo > ');
    }).toThrow('Expected literal, whitespace but end of input found.\n' + 'foo > \n' + '------^');
  });
  it('should throw an error for range queries missing a field', () => {
    expect(() => {
      (0, _ast.fromKueryExpression)('< 1000');
    }).toThrow('Expected "(", NOT, end of input, field name, value, whitespace but "<" found.\n' + '< 1000\n' + '^');
  });
});