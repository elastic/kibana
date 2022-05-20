/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { snakeCaseToCamelCase } from "./helpers";

describe('snakeCaseToCamelCase', () => {

  test('single word unchanged', () => {
    const word = 'agent';
    const result = snakeCaseToCamelCase(word);

    expect(result).toBe(word);
  });

  test('double word converted successfully', () => {
    const snake = 'user_agent';
    const camel = 'userAgent'; 
    const result = snakeCaseToCamelCase(snake);

    expect(result).toBe(camel);
  });

  test('really long example', () => {
    const snake = 'hello_this_is_my_test_case';
    const camel = 'helloThisIsMyTestCase'; 
    const result = snakeCaseToCamelCase(snake);

    expect(result).toBe(camel);
  });
});
