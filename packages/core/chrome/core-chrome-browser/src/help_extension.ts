/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type React from 'react';
import type { EuiButtonEmptyProps } from '@elastic/eui';

/** @public */
export interface ChromeHelpMenuActions {
  hideHelpMenu: () => void;
}

/** @public */
export interface ChromeHelpExtension {
  /**
   * Provide your plugin's name to create a header for separation
   */
  appName: string;
  /**
   * Creates unified links for sending users to documentation, GitHub, Discuss, or a custom link/button
   */
  links?: ChromeHelpExtensionMenuLink[];
  /**
   * Custom content to occur below the list of links
   */
  content?: (element: HTMLDivElement, menuActions: ChromeHelpMenuActions) => () => void;
}

/** @public */
export type ChromeHelpExtensionLinkBase = Pick<
  EuiButtonEmptyProps,
  'iconType' | 'target' | 'rel' | 'data-test-subj'
>;

/** @public */
export interface ChromeHelpExtensionMenuGitHubLink extends ChromeHelpExtensionLinkBase {
  /**
   * Creates a link to a new github issue in the Kibana repo
   */
  linkType: 'github';
  /**
   * Include at least one app-specific label to be applied to the new github issue
   */
  labels: string[];
  /**
   * Provides initial text for the title of the issue
   */
  title?: string;
}

/** @public */
export interface ChromeHelpExtensionMenuDiscussLink extends ChromeHelpExtensionLinkBase {
  /**
   * Creates a generic give feedback link with comment icon
   */
  linkType: 'discuss';
  /**
   * URL to discuss page.
   * i.e. `https://discuss.elastic.co/c/${appName}`
   */
  href: string;
}

/** @public */
export interface ChromeHelpExtensionMenuDocumentationLink extends ChromeHelpExtensionLinkBase {
  /**
   * Creates a deep-link to app-specific documentation
   */
  linkType: 'documentation';
  /**
   * URL to documentation page.
   * i.e. `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/${appName}.html`,
   */
  href: string;
}

/** @public */
export interface ChromeHelpExtensionMenuCustomLink extends ChromeHelpExtensionLinkBase {
  /**
   * Extend EuiButtonEmpty to provide extra functionality
   */
  linkType: 'custom';
  /**
   * URL of the link
   */
  href: string;
  /**
   * Content of the button (in lieu of `children`)
   */
  content: React.ReactNode;
  /**
   * Opens link in new tab
   */
  external?: boolean;
}

/** @public */
export interface ChromeGlobalHelpExtensionMenuLink extends ChromeHelpExtensionMenuCustomLink {
  /**
   * Highest priority items are listed at the top of the list of links.
   */
  priority: number;
}

/** @public */
export type ChromeHelpExtensionMenuLink =
  | ChromeHelpExtensionMenuGitHubLink
  | ChromeHelpExtensionMenuDiscussLink
  | ChromeHelpExtensionMenuDocumentationLink
  | ChromeHelpExtensionMenuCustomLink;
