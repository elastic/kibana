/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setup } from './helpers';

describe('Inline cast validation', () => {
  it('should not return any errors for a valid inline cast', async () => {
    const { expectErrors } = await setup();

    // simple literal cast
    await expectErrors('FROM index | EVAL col0 = 5::string', []);
    // multiple literal cast
    await expectErrors('FROM index | EVAL col0 = 5::string::int', []);

    // cast inside function
    await expectErrors('FROM index | EVAL col0 = CONCAT(5::string, "string")', []);
    // multiple casts inside functions
    await expectErrors(
      'FROM index | EVAL col0 = CONCAT(5::string, CONCAT(5::string, 6::string))',
      []
    );

    // cast of a column
    await expectErrors('FROM index | WHERE keywordField::string == "5"', []);
    // cast of an unknown column (if we don't known its type, don't throw an error)
    await expectErrors('FROM index | EVAL col0 = some_field::string', []);
    // cast of user defined column
    await expectErrors('FROM index | EVAL col0 = 5 | EVAL col1 = col0::string', []);

    // cast of a command option
    await expectErrors(
      'FROM index | EVAL col0 = 5 | COMPLETION col0::string WITH { "inference_id": "id" }',
      []
    );

    // ignores cases
    await expectErrors('FROM index | EVAL col0 = "value"::String', []);
  });

  it('should return an error for an unknown casting type', async () => {
    const { expectErrors } = await setup();
    await expectErrors('FROM index | EVAL col0 = "value"::intt', [
      `Unknown inline cast type "::intt"`,
    ]);
  });

  it('should return an error for an invalid cast value', async () => {
    const { expectErrors } = await setup();

    // On a literal
    await expectErrors('FROM index | EVAL col0 = true::date', [
      `Cannot cast value of type "boolean" to type "date"`,
    ]);

    // On a column
    await expectErrors('FROM index | WHERE booleanField::date > "2012"', [
      `Cannot cast value of type "boolean" to type "date"`,
    ]);

    // On user defined column
    await expectErrors('FROM index | EVAL col0 = true | EVAL col1 = col0::dense_vector', [
      `Cannot cast value of type "boolean" to type "dense_vector"`,
    ]);

    // On nested casts
    await expectErrors('FROM index | EVAL col0 = "2012"::date::dense_vector', [
      `Cannot cast value of type "date" to type "dense_vector"`,
    ]);

    // Multiple cast errors
    await expectErrors('FROM index | EVAL col0 = true::date::intt', [
      `Cannot cast value of type "boolean" to type "date"`,
      `Unknown inline cast type "::intt"`,
    ]);
    await expectErrors('FROM index | EVAL col0 = true::date::geo_shape', [
      `Cannot cast value of type "boolean" to type "date"`,
      `Cannot cast value of type "date" to type "geo_shape"`,
    ]);
  });
});
