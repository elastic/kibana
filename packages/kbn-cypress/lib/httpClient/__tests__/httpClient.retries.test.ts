import * as log from "cypress-cloud/lib/log";
import nock from "nock";
import { getAPIBaseUrl, getDelay, isRetriableError } from "../config";
import { makeRequest } from "../httpClient";

jest.mock("../config");
jest.mock("cypress-cloud/lib/log");

(getAPIBaseUrl as jest.Mock).mockReturnValue("http://localhost:1234");
const apiMock = nock(getAPIBaseUrl()).persist();

describe("HTTP Client Retries", () => {
  it("does not retry non-axios errors", async () => {
    (isRetriableError as jest.Mock).mockReturnValueOnce(false);
    apiMock.get("/").reply(503);

    await expect(
      makeRequest({
        baseURL: getAPIBaseUrl(),
        method: "GET",
        url: "/",
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Request failed with status code 503"`
    );
    expect(isRetriableError).toHaveBeenCalledTimes(1);
  });

  it("retries and shows warnings according to attempts config", async () => {
    const retries: any[] = [0, 0];
    (isRetriableError as jest.Mock).mockReturnValue(true);
    (getDelay as jest.Mock).mockReturnValue(0);

    apiMock.get("/").reply(503);

    try {
      await makeRequest({
        baseURL: getAPIBaseUrl(),
        method: "GET",
        url: "/",
      });
    } catch (r) {}

    expect(log.warn).toHaveBeenCalledTimes(retries.length + 1);
    expect(isRetriableError).toHaveBeenCalledTimes(retries.length + 1);
  });
});
