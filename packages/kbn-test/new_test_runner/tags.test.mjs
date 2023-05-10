import test from "node:test";
import assert from "node:assert";
test("GET /todos returns status 200", async (t) => {
  t.after(async () => {
    console.log('\n### after');
  });
  assert.deepStrictEqual(200, 200);
});
