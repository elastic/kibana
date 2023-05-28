import { describe, expect, it } from "@jest/globals";
import { preprocessParams } from "../params";
// generate unit tess for preprocessParams

describe("preprocessParams", () => {
  it.each([
    [
      "should return params with spec as string",
      { spec: "test1,test2" },
      ["test1", "test2"],
    ],
    [
      "should return params for an array of comma-separated strings",
      { spec: ["test1,test2", "test3,test4"] },
      ["test1", "test2", "test3", "test4"],
    ],
    [
      "should return params with spec as array",
      { spec: ["test1", "test2"] },
      ["test1", "test2"],
    ],
    [
      "should return params with spec as single string",
      { spec: "test1" },
      ["test1"],
    ],
    [
      "should return params with undefined spec",
      { spec: undefined },
      undefined,
    ],
    ["should return params with nullspec", { spec: null }, undefined],
    ["should return params with empty", { spec: [] }, []],
  ])("%s", (title, params, expected) => {
    // @ts-expect-error
    const result = preprocessParams(params);
    expect(result.spec).toEqual(expected);
  });
});
