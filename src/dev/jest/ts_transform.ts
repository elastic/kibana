import { getCacheKey, install, process } from 'ts-jest';
import { JestConfig, TransformOptions } from 'ts-jest/dist/jest-types';

import { getTsProjectForAbsolutePath } from '../typescript';

function extendJestConfigJSON(jestConfigJSON: string, filePath: string) {
  const jestConfig = JSON.parse(jestConfigJSON) as JestConfig;
  return JSON.stringify(extendJestConfig(jestConfig, filePath));
}

function extendJestConfig(jestConfig: JestConfig, filePath: string) {
  return {
    ...jestConfig,
    globals: {
      ...(jestConfig.globals || {}),
      'ts-jest': {
        skipBabel: true,
        tsConfigFile: getTsProjectForAbsolutePath(filePath).tsConfigPath,
      },
    },
  };
}

module.exports = {
  process(
    src: string,
    filePath: string,
    jestConfig: JestConfig,
    transformOptions: TransformOptions
  ) {
    const extendedConfig = extendJestConfig(jestConfig, filePath);
    return process(src, filePath, extendedConfig, transformOptions);
  },

  getCacheKey(
    src: string,
    filePath: string,
    jestConfigJSON: string,
    transformOptions: TransformOptions
  ) {
    const extendedConfigJSON = extendJestConfigJSON(jestConfigJSON, filePath);
    return getCacheKey(src, filePath, extendedConfigJSON, transformOptions);
  },

  install,
};
