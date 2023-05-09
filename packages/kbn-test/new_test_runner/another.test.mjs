/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */


import { describe, it, before, after, test } from "node:test";
import assert from "node:assert";

describe("lifecycle stuff", { skip: true}, () => {
  // before(async () => {
  // });
  // after(async () => {
  // });
  it("blah", async () => {
    assert.deepStrictEqual(200, 200);
  });
});

test("another blah", async (t) => {
  t.after(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1 * 1000));
    console.log('\n### After Bro');
  });
  // const res = await app.inject({
  //   url: "/todos",
  // });
  assert.deepStrictEqual(200, 200);
});
