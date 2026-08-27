/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the Elastic License 2.0, the GNU Affero General Public
 * License v3.0 only, or the Server Side Public License, v 1.
 */

export const CONNECTOR_SECRET_TOKEN_PREFIX = '__KBN_WORKFLOW_CONNECTOR_SECRET_PARAM__';
export const CONNECTOR_SECRET_TOKEN_PATTERN =
  /__KBN_WORKFLOW_CONNECTOR_SECRET_PARAM__([A-Za-z_][A-Za-z0-9_]*)__/g;

export const getConnectorSecretToken = (key: string): string =>
  `${CONNECTOR_SECRET_TOKEN_PREFIX}${key}__`;
