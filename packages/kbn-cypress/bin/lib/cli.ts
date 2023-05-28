import { CurrentsRunParameters, TestingType } from "../../types";
import Debug from "debug";
import { sanitizeAndConvertNestedArgs } from "./parser";
import { program } from "./program";

const debug = Debug("currents:cli");

export function parseCLIOptions(
  _program: typeof program = program,
  ...args: Parameters<typeof program.parse>
) {
  _program.parse(...args);
  debug("parsed CLI flags %o", _program.opts());

  const { e2e, component } = _program.opts();
  if (e2e && component) {
    _program.error("Cannot use both e2e and component options");
  }

  return getRunParametersFromCLI(_program.opts());
}

/**
 * Transforms the CLI options into the format that the `run` API expects
 *
 * @param cliOptions
 * @returns Currents run parameters
 */
export function getRunParametersFromCLI(
  cliOptions: ReturnType<typeof program.opts>
): CurrentsRunParameters {
  const { component, e2e, ...restOptions } = cliOptions;
  const testingType: TestingType = component ? "component" : "e2e";

  const result: Partial<CurrentsRunParameters> = {
    ...restOptions,
    config: sanitizeAndConvertNestedArgs(cliOptions.config, "config"),
    env: sanitizeAndConvertNestedArgs(cliOptions.env, "env"),
    reporterOptions: sanitizeAndConvertNestedArgs(
      cliOptions.reporterOptions,
      "reporterOptions"
    ),
    testingType,
    recordKey: cliOptions.key,
  };

  debug("parsed run params: %o", result);
  return result;
}
