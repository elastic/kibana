/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { convertCamelCasedKeysToSnakeCase } from './snake_case';

describe('snake case', () => {
  test('flat object', () => {
    const flatCamelCasedObject = {
      test: 'this key should not be snake cased',
      camelCasedKey: 'this key should be snake cased',
    };
    expect(convertCamelCasedKeysToSnakeCase(flatCamelCasedObject)).toEqual({
      test: flatCamelCasedObject.test,
      camel_cased_key: flatCamelCasedObject.camelCasedKey,
    });
  });

  test('deeply nested object', () => {
    const deeplyNestedCamelCasedObject = {
      theseAreFruits: true,
      fruitColours: {
        someApples: 'red',
        banana: 'yellow',
        cucumbersAreFruits: 'green',
        tomatoesAreAlsoFruits: {
          romaTomatoes: 'red',
          cherryTomatoes: 'red',
        },
      },
    };
    expect(convertCamelCasedKeysToSnakeCase(deeplyNestedCamelCasedObject)).toEqual({
      these_are_fruits: true,
      fruit_colours: {
        some_apples: 'red',
        banana: 'yellow',
        cucumbers_are_fruits: 'green',
        tomatoes_are_also_fruits: {
          roma_tomatoes: 'red',
          cherry_tomatoes: 'red',
        },
      },
    });
  });

  test('object with array', () => {
    const camelCasedObjectWithArray = {
      one: 1,
      two: {
        twoPointThree: 2.3,
        countToTwo: [1, 2],
      },
      countToTen: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    };
    expect(convertCamelCasedKeysToSnakeCase(camelCasedObjectWithArray)).toEqual({
      one: 1,
      two: {
        two_point_three: 2.3,
        count_to_two: [1, 2],
      },
      count_to_ten: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    });
  });

  test('object with null', () => {
    const camelCasedObjectWithArray = {
      iAmDefined: 'safe!',
      iAmNull: null,
      iAmUndefined: undefined,
    };
    expect(convertCamelCasedKeysToSnakeCase(camelCasedObjectWithArray)).toEqual({
      i_am_defined: 'safe!',
      i_am_null: null,
      i_am_undefined: undefined,
    });
  });

  test('object with snake cased keys', () => {
    const camelCasedObjectWithArray = {
      iAmCamelCased: true,
      i_am_snake_cased: 'true',
    };
    expect(convertCamelCasedKeysToSnakeCase(camelCasedObjectWithArray)).toEqual({
      i_am_camel_cased: true,
      i_am_snake_cased: 'true',
    });
  });

  test('object with matching key in snake case should prioritize snake case regardless of order', () => {
    const matchingKeys = {
      weMatch: true,
      we_match: 'true',
    };
    expect(convertCamelCasedKeysToSnakeCase(matchingKeys)).toEqual({
      we_match: 'true',
    });
    const matchingKeysReverseOrder = {
      we_match: 'true',
      weMatch: true,
    };
    expect(convertCamelCasedKeysToSnakeCase(matchingKeysReverseOrder)).toEqual({
      we_match: 'true',
    });
  });
});
