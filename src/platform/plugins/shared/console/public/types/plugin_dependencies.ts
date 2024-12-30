/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import type {
  AnalyticsServiceStart,
  I18nStart,
  ThemeServiceStart,
  UserProfileService,
} from '@kbn/core/public';
import { HomePublicPluginSetup, HomePublicPluginStart } from '@kbn/home-plugin/public';
import { DevToolsSetup } from '@kbn/dev-tools-plugin/public';
import { UsageCollectionSetup, UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { SharePluginSetup, SharePluginStart, LocatorPublic } from '@kbn/share-plugin/public';

import { ConsoleUILocatorParams } from './locator';
import { EmbeddedConsoleView } from './embeddable_console';

export interface ConsoleStartServices {
  analytics: Pick<AnalyticsServiceStart, 'reportEvent'>;
  i18n: I18nStart;
  theme: Pick<ThemeServiceStart, 'theme$'>;
  userProfile: UserProfileService;
}

export interface AppSetupUIPluginDependencies {
  home?: HomePublicPluginSetup;
  devTools: DevToolsSetup;
  share: SharePluginSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface AppStartUIPluginDependencies {
  home?: HomePublicPluginStart;
  share: SharePluginStart;
  usageCollection?: UsageCollectionStart;
}

/**
 * Console plugin's setup service object
 */
export interface ConsolePluginSetup {
  /**
   * Public locator for the console UI
   */
  locator?: LocatorPublic<ConsoleUILocatorParams>;
}

/**
 * Console plugin's start service object
 */
export interface ConsolePluginStart {
  /**
   * isEmbeddedConsoleAvailable is available if the embedded console can be rendered. Returns true when
   * called if the Embedded Console is currently rendered.
   */
  isEmbeddedConsoleAvailable?: () => boolean;
  /**
   * openEmbeddedConsole is available if the embedded console can be rendered. Calling
   * this function will open the embedded console on the page if it is currently rendered.
   */
  openEmbeddedConsole?: (content?: string) => void;
  /**
   * openEmbeddedConsoleAlternateView is available if the embedded console can be rendered.
   * Calling this function will open the embedded console to the alternative view. If there is no alternative view registered
   * this will open the embedded console.
   */
  openEmbeddedConsoleAlternateView?: () => void;
  /**
   * EmbeddableConsole is a functional component used to render a portable version of the dev tools console on any page in Kibana
   */
  EmbeddableConsole?: FC<{}>;
  /**
   * Register an alternate view for the Embedded Console
   *
   * When registering an alternate view ensure that the content component you register is lazy loaded.
   */
  registerEmbeddedConsoleAlternateView?: (view: EmbeddedConsoleView | null) => void;
}
