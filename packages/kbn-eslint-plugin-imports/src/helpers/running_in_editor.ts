/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const RUNNING_IN_EDITOR =
  // vscode sets this in the env for all workers
  !!process.env.VSCODE_CWD ||
  // MacOS sets this for intellij processes, not sure if it works in webstorm but we could expand this check later
  !!process.env.__CFBundleIdentifier?.startsWith('com.jetbrains.intellij');
