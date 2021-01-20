/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Defines Security OSS application state.
 */
export interface AppState {
  insecureClusterAlert: { displayAlert: boolean };
  anonymousAccess: {
    isEnabled: boolean;
    accessURLParameters: Record<string, string> | null;
  };
}
