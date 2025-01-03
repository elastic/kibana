/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { ConnectionDetailsService } from '../service';

export const context = React.createContext<ConnectionDetailsService>(null!);

export const useConnectionDetailsService = (): ConnectionDetailsService => {
  const value = React.useContext(context);

  if (!value || Object.keys(value).length === 0) {
    throw new Error('ConnectionDetailsServiceProvider is not set up.');
  }

  return value;
};
