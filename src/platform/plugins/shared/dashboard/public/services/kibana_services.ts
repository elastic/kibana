/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public/plugin';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { NoDataPagePluginStart } from '@kbn/no-data-page-plugin/public';
import type { ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { ScreenshotModePluginStart } from '@kbn/screenshot-mode-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { UiActionsPublicStart } from '@kbn/ui-actions-plugin/public/plugin';
import type { UrlForwardingStart } from '@kbn/url-forwarding-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';

import type { DashboardStartDependencies } from '../plugin';

export let coreServices: CoreStart;
export let contentManagementService: ContentManagementPublicStart;
export let dataService: DataPublicPluginStart;
export let dataViewEditorService: DataViewEditorStart;
export let embeddableService: EmbeddableStart;
export let fieldFormatService: FieldFormatsStart;
export let navigationService: NavigationPublicPluginStart;
export let noDataPageService: NoDataPagePluginStart | undefined;
export let observabilityAssistantService: ObservabilityAIAssistantPublicStart | undefined;
export let lensService: LensPublicStart | undefined;
export let presentationUtilService: PresentationUtilPluginStart;
export let savedObjectsTaggingService: SavedObjectTaggingOssPluginStart | undefined;
export let screenshotModeService: ScreenshotModePluginStart;
export let serverlessService: ServerlessPluginStart | undefined;
export let shareService: SharePluginStart | undefined;
export let spacesService: SpacesApi | undefined;
export let uiActionsService: UiActionsPublicStart;
export let urlForwardingService: UrlForwardingStart;
export let usageCollectionService: UsageCollectionStart | undefined;

const servicesReady$ = new BehaviorSubject(false);

export const setKibanaServices = (kibanaCore: CoreStart, deps: DashboardStartDependencies) => {
  coreServices = kibanaCore;
  contentManagementService = deps.contentManagement;
  dataService = deps.data;
  dataViewEditorService = deps.dataViewEditor;
  embeddableService = deps.embeddable;
  fieldFormatService = deps.fieldFormats;
  navigationService = deps.navigation;
  noDataPageService = deps.noDataPage;
  observabilityAssistantService = deps.observabilityAIAssistant;
  lensService = deps.lens;
  presentationUtilService = deps.presentationUtil;
  savedObjectsTaggingService = deps.savedObjectsTaggingOss;
  serverlessService = deps.serverless;
  screenshotModeService = deps.screenshotMode;
  shareService = deps.share;
  spacesService = deps.spaces;
  uiActionsService = deps.uiActions;
  urlForwardingService = deps.urlForwarding;
  usageCollectionService = deps.usageCollection;

  servicesReady$.next(true);
};

export const untilPluginStartServicesReady = () => {
  if (servicesReady$.value) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const subscription = servicesReady$.subscribe((isInitialized) => {
      if (isInitialized) {
        subscription.unsubscribe();
        resolve();
      }
    });
  });
};
