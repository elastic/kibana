/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { UiCounterMetricType } from '@kbn/analytics';
import type { ApplicationStart } from '../../../../core/public/application/types';
import type { ChromeStart } from '../../../../core/public/chrome/types';
import type { DocLinksStart } from '../../../../core/public/doc_links/doc_links_service';
import type { HttpStart } from '../../../../core/public/http/types';
import type { NotificationsSetup } from '../../../../core/public/notifications/notifications_service';
import type { OverlayStart } from '../../../../core/public/overlays/overlay_service';
import type { SavedObjectsClientContract } from '../../../../core/public/saved_objects/saved_objects_client';
import type { IUiSettingsClient } from '../../../../core/public/ui_settings/types';
import type { TelemetryPluginStart } from '../../../telemetry/public/plugin';
import type { UrlForwardingStart } from '../../../url_forwarding/public/plugin';
import type { ConfigSchema } from '../../config';
import { AddDataService } from '../services/add_data/add_data_service';
import { EnvironmentService } from '../services/environment/environment';
import { FeatureCatalogueRegistry } from '../services/feature_catalogue/feature_catalogue_registry';
import { TutorialService } from '../services/tutorials/tutorial_service';

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
  addDataService: AddDataService;
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
