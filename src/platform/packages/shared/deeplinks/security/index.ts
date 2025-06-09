/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SecurityPageName } from './deep_links';
import type { SecurityPageNameAiSoc } from './deep_links_ai_soc';

export { SecurityPageName } from './deep_links';
export { SecurityPageNameAiSoc } from './deep_links_ai_soc';

export const SECURITY_APP_ID = 'securitySolutionUI';

export type AppId = typeof SECURITY_APP_ID;

export const AI_FOR_SOC_APP_ID = 'aiForSocUI';
export type AiSocAppId = typeof AI_FOR_SOC_APP_ID;

export type LinkId = `${SecurityPageName}`;
export type AiSocLinkId = `${SecurityPageNameAiSoc}`;

export type DeepLinkId = AppId | `${AppId}:${LinkId}` | AiSocAppId | `${AiSocAppId}:${AiSocLinkId}`;
