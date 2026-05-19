/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import type React from 'react';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template-types';
export declare const _KibanaPageTemplate: FC<KibanaPageTemplateProps>;
/**
 * Kibana-specific wrapper of EuiPageTemplate and it's namespaced components
 */
export declare const KibanaPageTemplate: FC<KibanaPageTemplateProps> & {
  Sidebar: React.FunctionComponent<import('@elastic/eui').EuiPageSidebarProps>;
  Header: React.FunctionComponent<import('@elastic/eui').EuiPageHeaderProps>;
  Section: React.FunctionComponent<import('@elastic/eui').EuiPageSectionProps>;
  BottomBar: React.FunctionComponent<
    import('@elastic/eui/src/components/page_template/bottom_bar/page_bottom_bar')._EuiPageBottomBarProps
  >;
  EmptyPrompt: React.FunctionComponent<
    import('@elastic/eui/src/components/page_template/empty_prompt/page_empty_prompt')._EuiPageEmptyPromptProps
  >;
};
