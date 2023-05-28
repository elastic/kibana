import {
  CurrentsRunParameters,
  ValidatedCurrentsParameters,
} from "../../types";
import { MergedConfig } from "../config/config";
import { warn } from "../log";
import { findSpecs } from "./specMatcher";

export const getSpecFiles = async ({
  config,
  params,
}: {
  config: MergedConfig;
  params: ValidatedCurrentsParameters;
}) => {
  const specPattern = getSpecPattern(config.specPattern, params.spec);
  // find the spec files according to the resolved configuration
  const specs = await findSpecs({
    // https://docs.cypress.io/guides/guides/command-line#cypress-run-spec-lt-spec-gt
    projectRoot: params.project ?? config.projectRoot,
    testingType: params.testingType,
    specPattern,
    configSpecPattern: config.specPattern,
    excludeSpecPattern: config.excludeSpecPattern,
    additionalIgnorePattern: config.additionalIgnorePattern,
  });
  if (specs.length === 0) {
    warn(
      "Found no spec files. Was looking for spec files that match both configSpecPattern and specPattern relative to projectRoot. Configuration: %O",
      {
        projectRoot: config.projectRoot,
        specPattern,
        configSpecPattern: config.specPattern,
        excludeSpecPattern: [
          config.excludeSpecPattern,
          config.additionalIgnorePattern,
        ].flat(2),
        testingType: params.testingType,
      }
    );
  }
  return { specs, specPattern };
};

function getSpecPattern(
  configPattern: MergedConfig["specPattern"],
  explicit?: CurrentsRunParameters["spec"]
) {
  return explicit || configPattern;
}
