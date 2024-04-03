/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createContext, useContext } from 'react';
import { RuleFormConfig } from '../types';

export const DEFAULT_CONFIG: RuleFormConfig = {
  isUsingSecurity: false,
};

const ConfigContext = createContext<RuleFormConfig>(DEFAULT_CONFIG);

export const ConfigProvider = ConfigContext.Provider;
export const useConfigContext = () => useContext(ConfigContext);
