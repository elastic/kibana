/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as z from './zod';
import { instanceofZodType } from '.';

interface MyDef extends z.ZodTypeDef {
  typeName: 'myType';
}
class MyType extends z.ZodType {
  constructor(def: MyDef) {
    super(def);
  }
  _parse = (): any => {};
}

describe('instanceofZodType', () => {
  test('returns true for zod types', () => {
    const myType = new MyType({ typeName: 'myType' });
    expect(instanceofZodType(myType)).toBe(true);
  });
});
