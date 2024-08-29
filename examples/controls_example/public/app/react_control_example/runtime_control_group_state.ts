/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlGroupRuntimeState } from '@kbn/controls-plugin/public';

const RUNTIME_STATE_SESSION_STORAGE_KEY =
  'kibana.examples.controls.reactControlExample.controlGroupRuntimeState';

export function clearControlGroupRuntimeState() {
  sessionStorage.removeItem(RUNTIME_STATE_SESSION_STORAGE_KEY);
}

export function getControlGroupRuntimeState(): Partial<ControlGroupRuntimeState> {
  const runtimeStateJSON = sessionStorage.getItem(RUNTIME_STATE_SESSION_STORAGE_KEY);
  return runtimeStateJSON ? JSON.parse(runtimeStateJSON) : {};
}

export function setControlGroupRuntimeState(runtimeState: Partial<ControlGroupRuntimeState>) {
  sessionStorage.setItem(RUNTIME_STATE_SESSION_STORAGE_KEY, JSON.stringify(runtimeState));
}
