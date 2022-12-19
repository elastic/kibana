/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { createCmStateWithFixtures } from '@kbn/content-management-state';
import { context } from '.';

export const StateProviderWithFixtures: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state] = React.useState(() => createCmStateWithFixtures());

  return <context.Provider value={{ cache: state.cache }}>{children}</context.Provider>;
};
