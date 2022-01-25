/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { CoreStart, Plugin, PluginInitializerContext } from 'src/core/public';
import type {
  EngagementPluginSetup,
  EngagementPluginStart,
  EngagementPluginSetupDeps,
  EngagementPluginStartDeps,
} from './types';
import type { EngagementServices } from './services';
import { ServicesProvider } from './services';
import type { GetChatTokenResponseBody } from '../common';
import { GET_CHAT_TOKEN_ROUTE_PATH } from '../common';

export interface EngagementConfigType {
  chat: {
    enabled: boolean;
    chatURL: string;
  };
}

interface ChatUser {
  id: string;
  email: string;
}

export class EngagementPlugin
  implements
    Plugin<
      EngagementPluginSetup,
      Promise<EngagementPluginStart>,
      EngagementPluginSetupDeps,
      EngagementPluginStartDeps
    >
{
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(): EngagementPluginSetup {
    return {};
  }

  private async getChatUser(): Promise<ChatUser | null> {
    // TODO: obtain kibana and/or cloud user information
    return {
      id: 'user-id',
      email: 'test-user@elasticsearch.com',
    }
  }

  private async getChatIdentityToken(core: CoreStart, user: ChatUser | null): Promise<string | null> {
    if (!user) {
      return null;
    }

    try {
      const response = await core.http.get<GetChatTokenResponseBody>(GET_CHAT_TOKEN_ROUTE_PATH, {
        query: {
          userId: user.id,
        }
      });
      return response.token;
    } catch (error) {
      // TODO: add logger
      return null;
    }
  }

  public async start(core: CoreStart, plugins: EngagementPluginStartDeps): Promise<EngagementPluginStart> {
    const { sharedUX } = plugins;

    const user = await this.getChatUser();

    const chatIdentityToken = await this.getChatIdentityToken(core, user);

    const config = this.initializerContext.config.get<EngagementConfigType>();

    let chat: EngagementServices['chat'] = { enabled: false };
    if (config.chat.enabled && user && chatIdentityToken) {
      chat = {
        ...config.chat,
        userID: user.id,
        userEmail: user.email,
        identityJWT: chatIdentityToken,
      }
    }

    return {
      ContextProvider: ({ children }) => (
        <sharedUX.ServicesContext>
          <ServicesProvider chat={chat}>{children}</ServicesProvider>
        </sharedUX.ServicesContext>
      ),
    };
  }

  public stop() {}
}
