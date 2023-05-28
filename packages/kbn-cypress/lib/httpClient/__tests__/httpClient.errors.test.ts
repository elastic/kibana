import { expect } from "@jest/globals";
import * as log from "cypress-cloud/lib/log";
import nock from "nock";
import { makeRequest } from "../httpClient";
import { formatGenericError } from "../printErrors";

jest.mock("cypress-cloud/lib/log");

const apiMock = nock("https://cy.currents.dev");

/**
 * 422 is "GenericError" in the director package
 * the payload is:
 * {
 *  message: string;
 *  errors: string[];
 * }
 */

describe("HTTP Client Expected Errors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("handles known errors with details", async () => {
    const message = "Error message";
    const errors = ["Error 1", "Error 2"];
    apiMock.get("/").reply(422, {
      message,
      errors,
    });

    await expect(makeRequest({})).rejects.toThrow();
    expect(log.warn).toHaveBeenCalledWith(
      ...formatGenericError(message, errors)
    );
  });

  it("handles known errors without details", async () => {
    const message = "Error message";
    apiMock.get("/").reply(422, {
      message,
      errors: [],
    });

    await expect(makeRequest({})).rejects.toThrow();
    expect(log.warn).toHaveBeenCalledWith(message);
  });

  it("handles unknown errors", async () => {
    // const message = "Error message";
    apiMock.get("/").reply(422, {
      message: undefined,
      errors: [],
    });

    await expect(makeRequest({})).rejects.toThrow();
    expect(log.warn).toHaveBeenCalledWith(...formatGenericError());
  });
});
