import { expect } from "@jest/globals";
import { ResolvedConfig } from "../config";
import { summarizeTestResults } from "../results";
import { summaryTable } from "../table";
import commonPath from "./fixtures/payloads/cypressResult/no-exception/common-path";
import mixedResults from "./fixtures/payloads/cypressResult/no-exception/mixed";
import singleFailed from "./fixtures/payloads/cypressResult/no-exception/single-failed";
import singlePassed from "./fixtures/payloads/cypressResult/no-exception/single-passed";

describe("Table", () => {
  it("renders table with failed tests correctly", () => {
    const result = summaryTable(
      summarizeTestResults(Object.values(singleFailed), {} as ResolvedConfig)
    );

    expect(result).toMatchSnapshot();
  });

  it("renders table with only successful tests correctly", () => {
    const result = summaryTable(
      summarizeTestResults(Object.values(singlePassed), {} as ResolvedConfig)
    );
    expect(result).toMatchSnapshot();
  });

  it("renders table with mixed results ", () => {
    const result = summaryTable(
      summarizeTestResults(Object.values(mixedResults), {} as ResolvedConfig)
    );
    expect(result).toMatchSnapshot();
  });

  it("renders common path stripped", () => {
    const result = summaryTable(
      summarizeTestResults(Object.values(commonPath), {} as ResolvedConfig)
    );
    expect(result).toMatchSnapshot();
  });
});
