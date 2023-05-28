import { expect } from "@jest/globals";
import { resolveCurrentsParams } from "../params";

jest.mock("../config", () => ({
  getCurrentsConfig: jest.fn(() => ({
    e2e: {
      batchSize: 10,
    },
    component: {
      batchSize: 20,
    },
  })),
}));

describe("resolveCurrentsParams", () => {
  it("picks the correct batch size for component tests", () => {
    expect(resolveCurrentsParams({ testingType: "component" })).toMatchObject({
      batchSize: 20,
    });
  });
  it("picks the correct batch size for e2e tests", () => {
    expect(resolveCurrentsParams({ testingType: "e2e" })).toMatchObject({
      batchSize: 10,
    });
  });

  it("picks e2e testingType", () => {
    expect(resolveCurrentsParams({})).toMatchObject({
      testingType: "e2e",
    });
  });
  it("picks e2e testingType", () => {
    expect(resolveCurrentsParams({ testingType: "e2e" })).toMatchObject({
      testingType: "e2e",
    });
  });
  it("picks component testingType", () => {
    expect(resolveCurrentsParams({ testingType: "component" })).toMatchObject({
      testingType: "component",
    });
  });
});
