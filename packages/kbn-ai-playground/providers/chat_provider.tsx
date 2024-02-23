/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext } from 'react';

export const ChatContext = createContext({
  navigateToIndexPage: () => {},
});

interface ChatProviderProps {
  navigateToIndexPage: () => void;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ navigateToIndexPage, children }) => {
  return <ChatContext.Provider value={{ navigateToIndexPage }}>{children}</ChatContext.Provider>;
};
