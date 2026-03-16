/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TsProject } from '@kbn/ts-projects';

import { getTsgoPaths, hasLocalTsgoPathOverrides } from './tsgo_path_rewrites';

const createProject = ({
  compilerOptions,
  directory,
  repoRel,
  base,
}: {
  base?: TsProject;
  compilerOptions?: Record<string, unknown>;
  directory: string;
  repoRel: string;
}): TsProject =>
  ({
    config: {
      compilerOptions,
    },
    directory,
    getBase: () => base,
    repoRel,
  } as TsProject);

describe('tsgo path rewrites', () => {
  it('rewrites root baseUrl and paths into explicit relative paths', () => {
    const root = createProject({
      directory: '/repo',
      repoRel: 'tsconfig.base.json',
      compilerOptions: {
        baseUrl: '.',
        paths: {
          '@elastic/opentelemetry-node/sdk': ['typings/@elastic/opentelemetry-node/sdk'],
          '@kbn/foo': ['src/platform/foo'],
          '@opentelemetry/semantic-conventions/incubating': [
            'typings/@opentelemetry/semantic-conventions/incubating',
          ],
          'zod/v4': ['typings/zod/v4'],
        },
      },
    });

    expect(hasLocalTsgoPathOverrides(root)).toBe(true);
    expect(getTsgoPaths(root)).toEqual({
      '@opentelemetry/api/build/src/metrics/Metric': [
        './node_modules/@opentelemetry/api/build/src/metrics/Metric',
      ],
      '@kbn/foo': ['./src/platform/foo'],
      canvg: ['./node_modules/canvg/lib/index.d.ts'],
      'cypress/types/net-stubbing': ['./node_modules/cypress/types/net-stubbing.d.ts'],
      'elasticsearch-8.x/lib/api/types': ['./node_modules/elasticsearch-8.x/lib/api/types'],
      'zod/v4': ['./node_modules/zod/v4/classic/index'],
      '*': ['./*'],
    });
  });

  it('treats local project paths as an override of inherited root paths', () => {
    const root = createProject({
      directory: '/repo',
      repoRel: 'tsconfig.base.json',
      compilerOptions: {
        baseUrl: '.',
        paths: {
          '@elastic/opentelemetry-node/sdk': ['typings/@elastic/opentelemetry-node/sdk'],
          '@kbn/foo': ['src/platform/foo'],
          '@opentelemetry/semantic-conventions/incubating': [
            'typings/@opentelemetry/semantic-conventions/incubating',
          ],
          'zod/v4': ['typings/zod/v4'],
        },
      },
    });
    const child = createProject({
      base: root,
      directory: '/repo/src/core/packages/chrome/navigation/packaging',
      repoRel: 'src/core/packages/chrome/navigation/packaging/tsconfig.json',
      compilerOptions: {
        paths: {
          '@kbn/core-chrome-layout-constants': ['./react/services/layout_constants.ts'],
        },
      },
    });

    expect(hasLocalTsgoPathOverrides(child)).toBe(true);
    expect(getTsgoPaths(child)).toEqual({
      '@kbn/core-chrome-layout-constants': ['./react/services/layout_constants.ts'],
    });
  });

  it('preserves inherited paths when synthesizing a wildcard for a local baseUrl', () => {
    const root = createProject({
      directory: '/repo',
      repoRel: 'tsconfig.base.json',
      compilerOptions: {
        baseUrl: '.',
        paths: {
          '@kbn/foo': ['src/platform/foo'],
        },
      },
    });
    const child = createProject({
      base: root,
      directory: '/repo/src/core/packages/chrome/navigation/packaging/example',
      repoRel: 'src/core/packages/chrome/navigation/packaging/example/tsconfig.json',
      compilerOptions: {
        baseUrl: '.',
      },
    });

    expect(getTsgoPaths(child)).toEqual({
      '@opentelemetry/api/build/src/metrics/Metric': [
        '../../../../../../../node_modules/@opentelemetry/api/build/src/metrics/Metric',
      ],
      '@kbn/foo': ['../../../../../../platform/foo'],
      canvg: ['../../../../../../../node_modules/canvg/lib/index.d.ts'],
      'cypress/types/net-stubbing': [
        '../../../../../../../node_modules/cypress/types/net-stubbing.d.ts',
      ],
      'elasticsearch-8.x/lib/api/types': [
        '../../../../../../../node_modules/elasticsearch-8.x/lib/api/types',
      ],
      'zod/v4': ['../../../../../../../node_modules/zod/v4/classic/index'],
      '*': ['./*'],
    });
  });

  it('does not preserve inherited paths when a project defines local paths and a local baseUrl', () => {
    const root = createProject({
      directory: '/repo',
      repoRel: 'tsconfig.base.json',
      compilerOptions: {
        baseUrl: '.',
        paths: {
          '@kbn/foo': ['src/platform/foo'],
        },
      },
    });
    const child = createProject({
      base: root,
      directory: '/repo/src/core/packages/chrome/navigation/packaging/example',
      repoRel: 'src/core/packages/chrome/navigation/packaging/example/tsconfig.json',
      compilerOptions: {
        baseUrl: '.',
        paths: {
          '@local/example': ['./src/example.ts'],
        },
      },
    });

    expect(getTsgoPaths(child)).toEqual({
      '@local/example': ['./src/example.ts'],
      '*': ['./*'],
    });
  });

  it('does not require explicit path rewrites for projects that inherit everything', () => {
    const root = createProject({
      directory: '/repo',
      repoRel: 'tsconfig.base.json',
      compilerOptions: {
        baseUrl: '.',
      },
    });
    const child = createProject({
      base: root,
      directory: '/repo/src/core/packages/chrome/layout/core-chrome-layout-utils',
      repoRel: 'src/core/packages/chrome/layout/core-chrome-layout-utils/tsconfig.json',
    });

    expect(hasLocalTsgoPathOverrides(child)).toBe(false);
  });
});
