/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Package } from '../types';

type TransformFunction = (param: string) => string;
const TRANSFORMS: Record<string, string | TransformFunction> = {
  'x-pack/platform/packages/shared/observability/': 'x-pack/platform/packages/shared/',
  'src/platform/packages/shared/chart_expressions/common':
    'src/platform/packages/shared/chart-expressions-common',
  'x-pack/solutions/search/packages/shared_ui': 'x-pack/solutions/search/packages/shared_ui',
  'x-pack/solutions/security/packages/security-solution/': 'x-pack/solutions/security/packages/',
  'x-pack/platform/plugins/shared/observability_ai_assistant':
    'x-pack/platform/plugins/shared/observability_ai_assistant',
  'x-pack/solutions/observability/plugins/observability_solution/':
    'x-pack/solutions/observability/plugins/',
  'x-pack/solutions/observability/packages/observability/observability_utils/observability_':
    'x-pack/solutions/observability/packages/',
  'x-pack/solutions/observability/packages/observability/':
    'x-pack/solutions/observability/packages/',
  'src/core/packages/core/': (path: string) => {
    const relativePath = path.split('src/core/packages/')[1];
    const relativeChunks = relativePath.split('/');
    const packageName = relativeChunks.pop();
    const unneededPrefix = relativeChunks.join('-') + '-';

    // strip the spare /core/ folder
    path = path.replace('src/core/packages/core/', 'src/core/packages/');

    if (packageName?.startsWith(unneededPrefix)) {
      return path.replace(unneededPrefix, '');
    } else {
      return path;
    }
  },
};
export const applyTransforms = (module: Package, path: string): string => {
  const transform = Object.entries(TRANSFORMS).find(([what]) => path.includes(what));
  if (!transform) {
    return path;
  } else {
    const [what, by] = transform;
    if (typeof by === 'function') {
      return by(path);
    } else if (typeof by === 'string') {
      return path.replace(what, by);
    } else {
      throw new Error('Invalid transform function', by);
    }
  }
};
