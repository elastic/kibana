import { describe, expect, it } from "@jest/globals";
import { ValidationError } from "cypress-cloud/lib/errors";
import { CurrentsRunParameters } from "../../types";
import { getCurrentsConfig } from "../config";
import {
  cloudServiceInvalidUrlError,
  cloudServiceUrlError,
  projectIdError,
  recordKeyError,
  validateParams,
} from "../params";

jest.mock("cypress-cloud/lib/log");
jest.mock("../config", () => ({
  getCurrentsConfig: jest.fn(() => ({
    e2e: {
      batchSize: 10,
    },
    component: {
      batchSize: 10,
    },
  })),
}));

describe("validateParams", () => {
  it("should throw an error if cloudServiceUrl is invalid", () => {
    expect(() => validateParams({ cloudServiceUrl: "" })).toThrow(
      new ValidationError(cloudServiceUrlError)
    );

    // invalid cloudServiceUrl
    expect(() =>
      validateParams({
        testingType: "e2e",
        projectId: "project-id",
        recordKey: "record-key",
        cloudServiceUrl: "not a valid url",
      })
    ).toThrow(
      new ValidationError(cloudServiceInvalidUrlError + ': "not a valid url"')
    );
  });
  it("should throw an error if projectId is not provided", () => {
    expect(() =>
      validateParams({ cloudServiceUrl: "a", projectId: "" })
    ).toThrow(new ValidationError(projectIdError));
  });
  it("should throw an error if recordKey is not provided", () => {
    expect(() =>
      validateParams({ projectId: "s", cloudServiceUrl: "f", recordKey: "" })
    ).toThrow(new ValidationError(recordKeyError));
  });

  it("should throw an error when a required parameter is missing", () => {
    (getCurrentsConfig as jest.Mock).mockReturnValueOnce({
      e2e: {},
    });
    const params: CurrentsRunParameters = {
      cloudServiceUrl: "http://localhost:3000",
      projectId: "project-1",
      recordKey: "some-key",
    };

    expect(() => validateParams(params)).toThrowError(
      "Missing required parameter"
    );
  });

  it("should transform string tag", () => {
    const params: CurrentsRunParameters = {
      batchSize: 10,
      testingType: "e2e",
      cloudServiceUrl: "http://localhost:3333",
      projectId: "abc123",
      recordKey: "def456",
      tag: "a,b,c",
    };

    expect(validateParams(params)).toMatchObject({
      tag: expect.arrayContaining(["a", "b", "c"]),
    });
  });

  it("should transform string[] tag", () => {
    const params: CurrentsRunParameters = {
      batchSize: 10,
      testingType: "e2e",
      cloudServiceUrl: "http://localhost:3333",
      projectId: "abc123",
      recordKey: "def456",
      tag: ["a", "b"],
    };

    expect(validateParams(params)).toMatchObject({
      tag: expect.arrayContaining(["a", "b"]),
    });
  });

  it("should return validated params if all required parameters are provided", () => {
    const params: CurrentsRunParameters = {
      batchSize: 10,
      testingType: "e2e",
      cloudServiceUrl: "http://localhost:3333",
      projectId: "abc123",
      recordKey: "def456",
      tag: [],
    };

    expect(validateParams(params)).toEqual({
      ...params,
    });
  });
});

describe("validateParams", () => {
  const baseParams: CurrentsRunParameters = {
    cloudServiceUrl: "https://example.com",
    projectId: "test-project",
    recordKey: "test-record-key",
    testingType: "e2e",
    batchSize: 5,
  };

  it.each([
    ["undefined", undefined, undefined],
    ["true", true, 1],
    ["false", false, false],
    ["positive number", 3, 3],
  ])("autoCancelAfterFailures: %s", (_description, input, expected) => {
    const params = { ...baseParams, autoCancelAfterFailures: input };
    // @ts-ignore
    const result = validateParams(params);
    expect(result.autoCancelAfterFailures).toEqual(expected);
  });

  it.each([
    ["zero", 0],
    ["negative number", -1],
    ["invalid type (string)", "invalid"],
  ])(
    "autoCancelAfterFailures: throws ValidationError for %s",
    (_description, input) => {
      const params = { ...baseParams, autoCancelAfterFailures: input };
      expect(() => {
        // @ts-ignore
        validateParams(params);
      }).toThrow(ValidationError);
    }
  );
});
