/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { ApplicationService } from './src/application_service';
export { CoreScopedHistory } from './src/scoped_history';
export type {
  InternalApplicationSetup,
  InternalApplicationStart,
  Mounter,
  ParsedAppUrl,
} from './src/types';
export {
  appendAppPath,
  getAppInfo,
  parseAppUrl,
  relativeToAbsolute,
  removeSlashes,
} from './src/utils';
