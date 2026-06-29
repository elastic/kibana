/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type BeforeNavigateToAppHandler = (appId: string) => void;

let beforeNavigateToAppHandler: BeforeNavigateToAppHandler | undefined;

/**
 * Registers a handler invoked before `application.navigateToApp` runs.
 * Used by agent-first chrome to reopen the application workspace column.
 */
export const registerBeforeNavigateToApp = (handler: BeforeNavigateToAppHandler): (() => void) => {
  beforeNavigateToAppHandler = handler;
  return () => {
    if (beforeNavigateToAppHandler === handler) {
      beforeNavigateToAppHandler = undefined;
    }
  };
};

export const notifyBeforeNavigateToApp = (appId: string): void => {
  beforeNavigateToAppHandler?.(appId);
};
