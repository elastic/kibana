/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { getAgentIcon } from './src/components/agent_icon/get_agent_icon';
export { getServerlessIcon } from './src/components/agent_icon/get_serverless_icon';
export { AgentIcon } from './src/components/agent_icon';
export type { AgentIconProps } from './src/components/agent_icon';

export { getCloudProviderIcon } from './src/components/cloud_provider_icon/get_cloud_provider_icon';
export type { CloudProvider } from './src/components/cloud_provider_icon/get_cloud_provider_icon';
export { CloudProviderIcon } from './src/components/cloud_provider_icon';
export type { CloudProviderIconProps } from './src/components/cloud_provider_icon';

export { getLogoIcon, LOGO_NAMES } from './src/components/logo_icon/get_logo_icon';
export type { LogoName } from './src/components/logo_icon/get_logo_icon';
export { LogoIcon } from './src/components/logo_icon';
export type { LogoIconProps } from './src/components/logo_icon';
