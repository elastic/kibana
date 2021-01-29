/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  ChromeStart,
  DocLinksStart,
  HttpStart,
  NotificationsSetup,
  OverlayStart,
  SavedObjectsClientContract,
  IUiSettingsClient,
  ApplicationStart,
} from 'kibana/public';
import { UiCounterMetricType } from '@kbn/analytics';
import { TelemetryPluginStart } from '../../../telemetry/public';
import { UrlForwardingStart } from '../../../url_forwarding/public';
import { TutorialService } from '../services/tutorials';
import { FeatureCatalogueRegistry } from '../services/feature_catalogue';
import { EnvironmentService } from '../services/environment';
import { ConfigSchema } from '../../config';

export interface HomeKibanaServices {
  indexPatternService: any;
  kibanaVersion: string;
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
  telemetry?: TelemetryPluginStart;
  tutorialService: TutorialService;
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
