/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

import { CoreStart } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import { EmbeddableStart } from '@kbn/embeddable-plugin/public/plugin';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public/plugin';
import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { SpacesApi } from '@kbn/spaces-plugin/public';
import { VisualizationsStart } from '@kbn/visualizations-plugin/public';
import { DashboardStartDependencies } from '../plugin';

export let coreServices: CoreStart;
export let dataService: DataPublicPluginStart;
export let dataViewEditorService: DataViewEditorStart;
export let embeddableService: EmbeddableStart;
export let fieldFormatService: FieldFormatsStart;
// export let initContextService: PluginInitializerContext;
export let navigationService: NavigationPublicPluginStart;
export let presentationUtilService: PresentationUtilPluginStart;
export let shareService: SharePluginStart | undefined;
export let spacesService: SpacesApi | undefined;
export let visualizationsService: VisualizationsStart;
// export let dataViewsService: DataViewsPublicPluginStart;

const servicesReady$ = new BehaviorSubject(false);

export const setKibanaServices = (kibanaCore: CoreStart, deps: DashboardStartDependencies) => {
  coreServices = kibanaCore;
  dataService = deps.data;
  dataViewEditorService = deps.dataViewEditor;
  embeddableService = deps.embeddable;
  fieldFormatService = deps.fieldFormats;
  navigationService = deps.navigation;
  presentationUtilService = deps.presentationUtil;
  shareService = deps.share;
  spacesService = deps.spaces;
  visualizationsService = deps.visualizations;
  // dataViewsService = deps.dataViews;

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
