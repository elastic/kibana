import { getCacheKey, install, process } from 'ts-jest';
import { JestConfig, TransformOptions } from 'ts-jest/dist/jest-types';

import { transform } from 'typescript';
import { Project, TS_PROJECTS } from '../typescript';

function extendJestConfigJSON(jestConfigJSON: string, filePath: string) {
  const jestConfig = JSON.parse(jestConfigJSON) as JestConfig;
  return JSON.stringify(extendJestConfig(jestConfig, filePath));
}

function extendJestConfig(jestConfig: JestConfig, filePath: string) {
  const project = TS_PROJECTS.find(p => p.isAbsolutePathSelected(filePath));

  if (!project) {
    throw new Error(
      'Unable to find tsconfig.json file selecting file "${filePath}". Ensure one exists and it is listed in "src/dev/typescript/projects.ts"'
    );
  }

  return {
    ...jestConfig,
    globals: {
      ...(jestConfig.globals || {}),
      'ts-jest': {
        tsConfigFile: project.getTsConfigPath(),
        skipBabel: true,
      },
    },
  };
}

module.exports = {
  process(src: string, filePath: string, jestConfig: JestConfig, transformOptions: TransformOptions) {
    const extendedConfig = extendJestConfig(jestConfig, filePath);
    return process(src, filePath, extendedConfig, transformOptions);
  },

  getCacheKey(src: string, filePath: string, jestConfigJSON: string, transformOptions: TransformOptions) {
    const extendedConfigJSON = extendJestConfigJSON(jestConfigJSON, filePath);
    return getCacheKey(src, filePath, extendedConfigJSON, transformOptions);
  },

  install,
};
