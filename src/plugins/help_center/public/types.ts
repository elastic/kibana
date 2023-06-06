/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { ScreenshotModePluginStart } from '@kbn/screenshot-mode-plugin/public';
import {
  ChromeGlobalHelpExtensionMenuLink,
  ChromeHelpExtension,
  ChromeHelpExtensionMenuDiscussLink,
  ChromeHelpExtensionMenuDocumentationLink,
} from '@kbn/core-chrome-browser';

export interface HelpCenterPluginStartDependencies {
  screenshotMode: ScreenshotModePluginStart;
  security?: SecurityPluginStart;
}

export interface HelpCenterLinks {
  kibanaDocLink: string;
  helpSupportLink?: string;
  helpExtension?: ChromeHelpExtension;
  globalHelpExtensionMenuLinks?: ChromeGlobalHelpExtensionMenuLink[];
}

export interface FetchResult {
  // links: HelpCenterLinks;
  documentation: Array<
    ChromeHelpExtensionMenuDocumentationLink & { title: string; priority: number }
  >;
  contact: ChromeHelpExtensionMenuDiscussLink[];
  global: ChromeGlobalHelpExtensionMenuLink[];
}
