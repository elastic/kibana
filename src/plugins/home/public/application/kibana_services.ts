/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UiCounterMetricType } from '@kbn/analytics';
import { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import {
  ApplicationStart,
  ChromeStart,
  DocLinksStart,
  HttpStart,
  I18nStart,
  IUiSettingsClient,
  NotificationsSetup,
  OverlayStart,
  SavedObjectsClientContract,
  ThemeServiceStart,
} from '@kbn/core/public';
import { DataViewsContract } from '@kbn/data-views-plugin/public';
import { GuidedOnboardingApi } from '@kbn/guided-onboarding-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import { UrlForwardingStart } from '@kbn/url-forwarding-plugin/public';
import { ConfigSchema } from '../../config';
import { AddDataService } from '../services/add_data';
import { EnvironmentService } from '../services/environment';
import { FeatureCatalogueRegistry } from '../services/feature_catalogue';
import { TutorialService } from '../services/tutorials';
import type { WelcomeService } from '../services/welcome';

export interface HomeKibanaServices {
  dataViewsService: DataViewsContract;
  kibanaVersion: string;
  share: SharePluginSetup;
  shareStart: SharePluginStart;
  chrome: ChromeStart;
  application: ApplicationStart;
  uiSettings: IUiSettingsClient;
  urlForwarding: UrlForwardingStart;
  homeConfig: ConfigSchema;
  featureCatalogue: FeatureCatalogueRegistry;
  http: HttpStart;
  savedObjectsClient: SavedObjectsClientContract;
  toastNotifications: NotificationsSetup['toasts'];
  banners: OverlayStart['banners'];
  trackUiMetric: (type: UiCounterMetricType, eventNames: string | string[], count?: number) => void;
  getBasePath: () => string;
  docLinks: DocLinksStart;
  addBasePath: (url: string) => string;
  environmentService: EnvironmentService;
  tutorialService: TutorialService;
  addDataService: AddDataService;
  welcomeService: WelcomeService;
  guidedOnboardingService?: GuidedOnboardingApi;
  cloud: CloudSetup;
  cloudStart: CloudStart;
  overlays: OverlayStart;
  theme: ThemeServiceStart;
  i18nStart: I18nStart;
}

let services: HomeKibanaServices | null = null;

export function setServices(newServices: HomeKibanaServices) {
  services = newServices;
}

export function getServices() {
  if (!services) {
    throw new Error(
      'Kibana services not set - are you trying to import this module from outside of the home app?'
    );
  }
  return services;
}
