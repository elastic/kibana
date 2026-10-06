import type { FC } from 'react';
import React from 'react';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template-types';
export declare const _KibanaPageTemplate: FC<KibanaPageTemplateProps>;
/**
 * Kibana-specific wrapper of EuiPageTemplate and it's namespaced components
 */
export declare const KibanaPageTemplate: FC<KibanaPageTemplateProps> & {
    Sidebar: React.FunctionComponent<import("@elastic/eui").EuiPageSidebarProps>;
    /**
     * @deprecated For top-level application route headers, use `AppHeader` from
     * `@kbn/app-header`. For non-route content, use `EuiPageTemplate.Header` directly.
     */
    Header: React.FunctionComponent<import("@elastic/eui").EuiPageHeaderProps>;
    Section: React.FunctionComponent<import("@elastic/eui").EuiPageSectionProps>;
    BottomBar: React.FunctionComponent<import("@elastic/eui/src/components/page_template/bottom_bar/page_bottom_bar")._EuiPageBottomBarProps>;
    EmptyPrompt: React.FunctionComponent<import("@elastic/eui/src/components/page_template/empty_prompt/page_empty_prompt")._EuiPageEmptyPromptProps>;
};
