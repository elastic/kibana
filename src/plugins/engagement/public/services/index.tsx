/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, createContext, useContext } from 'react';

interface WithoutChat {
  enabled: false;
}

interface WithChat {
  enabled: true;
  chatURL: string;
  identityJWT: string;
  userID: string;
  userEmail: string;
}

type ChatService = WithChat | WithoutChat;

export interface EngagementServices {
  chat: ChatService;
}

const ServicesContext = createContext<EngagementServices>({ chat: { enabled: false } });

export const ServicesProvider: FC<EngagementServices> = ({ children, ...services }) => (
  <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
);

/**
 * React hook for accessing the pre-wired `EngagementServices`.
 */
export function useServices() {
  return useContext(ServicesContext);
}

export function useChat(): ChatService {
  const { chat } = useServices();
  return chat;
}
