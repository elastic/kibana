/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILanguageServerHandler } from './proxy';

export interface ILanguageServerLauncher {
  launch(builtinWorkspace: boolean, maxWorkspace: number): Promise<ILanguageServerHandler>;
}
