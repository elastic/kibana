/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataSourceProfileProvider } from '../../../../profiles';

/**
 * Provides additional row controls for logs
 * For the universal base profile, we don't add any solution-specific controls
 * This is intentionally minimal - solution-specific profiles can extend this
 */
export const getRowAdditionalLeadingControls: DataSourceProfileProvider['profile']['getRowAdditionalLeadingControls'] =
  (prev) => (params) => {
    // eslint-disable-next-line no-console
    console.log('[Universal Logs Profile] getRowAdditionalLeadingControls called');

    // Return the previous controls without adding any new ones
    // Solution-specific profiles (like O11y) can add their own controls
    const additionalControls = prev(params) || [];
    
    return additionalControls;
  };
