const expect = require('expect.js');
const convertToSnakeCase = require('../convert_to_snake_case');
const _ = require('lodash');

describe('convertToSnakeCase', function () {

  it('should convert all of an object\'s keys to snake case', function () {
    const result = convertToSnakeCase({
      camelCase: 'camel_case',
      'kebab-case': 'kebab_case',
      snake_case: 'snake_case'
    });

    _.forEach(result, function (value, key) {
      expect(key).to.be(value);
    });
  });

});
