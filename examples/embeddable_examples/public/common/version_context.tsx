/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext } from 'react';

const VersionContext = createContext('1');

export const VersionProvider: React.FC<React.PropsWithChildren<{ version: string }>> = ({
  version,
  children,
}) => <VersionContext.Provider value={version}>{children}</VersionContext.Provider>;

export const useVersionContext = () => useContext(VersionContext);
