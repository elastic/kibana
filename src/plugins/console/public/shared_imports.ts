/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sendRequest, XJson } from '@kbn/es-ui-shared-plugin/public';

const { collapseLiteralStrings, expandLiteralStrings } = XJson;

export { sendRequest, collapseLiteralStrings, expandLiteralStrings };

export { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';

export { toMountPoint } from '@kbn/react-kibana-mount';

export type {
  SendRequestConfig,
  SendRequestResponse,
  Error,
} from '@kbn/es-ui-shared-plugin/public';
