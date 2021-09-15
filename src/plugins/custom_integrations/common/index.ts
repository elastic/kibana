/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const PLUGIN_ID = 'customIntegrations';
export const PLUGIN_NAME = 'customIntegrations';

export interface CategoryCount {
  count: number;
  id: Category;
}

export type Category =
  | 'aws'
  | 'azure'
  | 'cloud'
  | 'config_management'
  | 'containers'
  | 'crm'
  | 'custom'
  | 'datastore'
  | 'elastic_stack'
  | 'google_cloud'
  | 'kubernetes'
  | 'languages'
  | 'message_queue'
  | 'monitoring'
  | 'network'
  | 'notification'
  | 'os_system'
  | 'productivity'
  | 'security'
  | 'support'
  | 'ticketing'
  | 'version_control'
  | 'web'
  | 'other';

export interface CustomIntegration {
  id: string;
  title: string;
  name: string;
  description: string;
  type: 'ui_link';
  uiInternalPath: string;
  euiIconType: string;
  categories: Category[];
  isBeats: boolean;
  isAPM: boolean;
  beatsModuleName?: string;
  source?: string;
  eprEquivalent?: string[];
}
