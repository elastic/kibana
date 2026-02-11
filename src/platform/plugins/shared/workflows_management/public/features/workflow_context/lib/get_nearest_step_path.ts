/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function getNearestStepPath(path: Array<string | number>) {
  const reversedPath = [...path].reverse();
  const stepsIndex = reversedPath.findIndex((p) => p === 'steps' || p === 'else');
  if (stepsIndex === -1) {
    return null;
  }
  if (stepsIndex === 0) {
    return null;
  }
  return path.slice(0, path.length - stepsIndex + 1);
}
