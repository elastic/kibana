import { MergedConfig } from "../config";
import { guessBrowser } from "./browser";
import { getPlatformInfo } from "./platform";

export async function getPlatform({
  browser,
  config,
}: {
  browser?: string;
  config: MergedConfig;
}) {
  return {
    ...(await getPlatformInfo()),
    ...guessBrowser(browser ?? "electron", config.resolved?.browsers),
  };
}
