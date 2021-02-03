/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PresentationUtilPluginSetup {}

export interface PresentationUtilPluginStart {
  ContextProvider: React.FC;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PresentationUtilPluginSetupDeps {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PresentationUtilPluginStartDeps {}
