/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

let _canGatherUiMetrics = false;

export function setCanGatherUiMetrics(flag: boolean) {
  _canGatherUiMetrics = flag;
}

export function getCanGatherUiMetrics(): boolean {
  return _canGatherUiMetrics;
}
