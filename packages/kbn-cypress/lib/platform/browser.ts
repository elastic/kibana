import Debug from "debug";
import { DetectedBrowser, Platform } from "../../types";
import { warn } from "../log";

const debug = Debug("currents:browser");

export function guessBrowser(
  browser: string,
  availableBrowsers: DetectedBrowser[] = []
): Pick<Platform, "browserName" | "browserVersion"> {
  debug(
    "guessing browser from '%s', available browsers: %o",
    browser,
    availableBrowsers
  );
  // try identifying the browser by name first
  let result = availableBrowsers.find((b) => b.name === browser);

  if (result) {
    debug("identified browser by name: %o", result);
    return {
      browserName: result.displayName,
      browserVersion: result.version,
    };
  }

  // otherwise, try identifying by the path
  result = availableBrowsers.find((b) => b.path === browser);
  if (result) {
    debug("identified browser by path: %o", result);
    return {
      browserName: result.displayName ?? result.name,
      browserVersion: result.version,
    };
  }

  warn("Unable to identify browser name and version");

  // otherwise, return dummy browser
  return {
    browserName: "unknown",
    browserVersion: "unknown",
  };
}
