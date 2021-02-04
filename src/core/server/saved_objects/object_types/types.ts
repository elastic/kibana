/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * @internal
 */
export interface LegacyUrlAlias {
  targetNamespace: string;
  targetType: string;
  targetId: string;
  lastResolved?: string;
  resolveCounter?: number;
  disabled?: boolean;
}
