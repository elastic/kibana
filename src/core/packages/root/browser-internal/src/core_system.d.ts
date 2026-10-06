/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type InjectedMetadataParams } from '@kbn/core-injected-metadata-browser-internal';
import type { FatalErrorsSetup } from '@kbn/core-fatal-errors-browser';
/**
 * @internal
 */
export interface CoreSystemParams {
  rootDomElement: HTMLElement;
  browserSupportsCsp: boolean;
  injectedMetadata: InjectedMetadataParams['injectedMetadata'];
}
/**
 * The CoreSystem is the root of the new platform, and setups all parts
 * of Kibana in the UI, including the LegacyPlatform which is managed
 * by the LegacyPlatformService. As we migrate more things to the new
 * platform the CoreSystem will get many more Services.
 *
 * @internal
 */
export declare class CoreSystem {
  private readonly loggingSystem;
  private readonly analytics;
  private readonly fatalErrors;
  private readonly featureFlags;
  private readonly injectedMetadata;
  private readonly injection;
  private readonly notifications;
  private readonly http;
  private readonly httpRateLimiter;
  private readonly uiSettings;
  private readonly settings;
  private readonly chrome;
  private readonly i18n;
  private readonly overlay;
  private readonly plugins;
  private readonly application;
  private readonly docLinks;
  private readonly rendering;
  private readonly integrations;
  private readonly coreApp;
  private readonly deprecations;
  private readonly theme;
  private readonly rootDomElement;
  private readonly coreContext;
  private readonly executionContext;
  private readonly customBranding;
  private readonly security;
  private readonly userProfile;
  private readonly userStorage;
  private readonly pricing;
  private fatalErrorsSetup;
  private overlayNavigationSubscription;
  constructor(params: CoreSystemParams);
  private getLoadMarksInfo;
  private reportKibanaLoadedEvent;
  setup(): Promise<
    | {
        fatalErrors: FatalErrorsSetup;
      }
    | undefined
  >;
  start(): Promise<
    | {
        application: import('@kbn/core-application-browser-internal').InternalApplicationStart;
        executionContext: import('@kbn/core/public').ExecutionContextSetup;
      }
    | undefined
  >;
  stop(): void;
  /**
   * @deprecated
   */
  private registerLoadedKibanaEventType;
}
