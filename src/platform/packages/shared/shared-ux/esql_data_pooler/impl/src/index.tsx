/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { PropsWithChildren, createContext } from 'react';

interface ESQLDataPoolerContextType {
  query: string;
}

const ESQLDataPoolerContext = createContext<ESQLDataPoolerContextType | null>(null);

const ESQLDataPoolerProvider = ({ children }: PropsWithChildren) => {
  return (
    <ESQLDataPoolerContext.Provider value={{ query: '' }}>
      {children}
    </ESQLDataPoolerContext.Provider>
  );
};
