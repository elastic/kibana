/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IBasePath } from '@kbn/core-http-browser';
import type { AppMountParameters } from '@kbn/core-application-browser';
interface Deps {
  basePath: IBasePath;
}
/**
 * Renders UI for displaying error messages.
 * @internal
 */
export declare const renderApp: (
  { element, history, theme$ }: AppMountParameters,
  { basePath }: Deps
) => () => void;
export {};
