/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * A set of fields describing Kibana user.
 */
export interface User {
  username: string;
  email?: string;
  full_name?: string;
  roles: readonly string[];
  enabled: boolean;
  metadata?: {
    _reserved: boolean;
    _deprecated?: boolean;
    _deprecated_reason?: string;
  };
}
