/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import React from 'react';

import { tracksOverlays } from '@kbn/presentation-containers';
import {
  apiPublishesDataViews,
  apiPublishesLocalUnifiedSearch,
  apiPublishesViewMode,
  EmbeddableApiContext,
  PublishesDataViews,
  PublishesParentApi,
  PublishesViewMode,
  PublishesWritableLocalUnifiedSearch,
  PublishesWritablePanelDescription,
  PublishesWritablePanelTitle,
} from '@kbn/presentation-publishing';
import { core } from '../../kibana_services';
import { CustomizePanelEditor } from './customize_panel_editor';

export const ACTION_CUSTOMIZE_PANEL = 'ACTION_CUSTOMIZE_PANEL';

export type CustomizePanelActionApi = PublishesViewMode &
  PublishesDataViews &
  Partial<
    PublishesWritableLocalUnifiedSearch &
      PublishesWritablePanelDescription &
      PublishesWritablePanelTitle &
      PublishesParentApi
  >;

const isApiCompatible = (api: unknown | null): api is CustomizePanelActionApi =>
  Boolean(apiPublishesViewMode(api) && apiPublishesDataViews(api));
export class CustomizePanelAction implements Action<EmbeddableApiContext> {
  public type = ACTION_CUSTOMIZE_PANEL;
  public id = ACTION_CUSTOMIZE_PANEL;
  public order = 40;

  constructor() {}

  public getDisplayName({ embeddable }: EmbeddableApiContext): string {
    return i18n.translate('presentation.action.customizePanel.displayName', {
      defaultMessage: 'Panel settings',
    });
  }

  public getIconType() {
    return 'gear';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) return false;
    // It should be possible to customize just the time range in View mode
    return (
      embeddable.viewMode.value === 'edit' ||
      (apiPublishesLocalUnifiedSearch(embeddable) &&
        (embeddable.isCompatibleWithLocalUnifiedSearch?.() ?? true))
    );
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();

    // send the overlay ref to the parent if it is capable of tracking overlays
    const parent = embeddable.parentApi?.value;
    const overlayTracker = tracksOverlays(parent) ? parent : undefined;

    const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
      uiSettings: core.uiSettings,
    });

    const handle = core.overlays.openFlyout(
      toMountPoint(
        <KibanaReactContextProvider>
          <CustomizePanelEditor
            api={embeddable}
            onClose={() => {
              if (overlayTracker) overlayTracker.clearOverlays();
              handle.close();
            }}
          />
        </KibanaReactContextProvider>,
        { theme: core.theme, i18n: core.i18n }
      ),
      {
        size: 's',
        'data-test-subj': 'customizePanel',
        onClose: (overlayRef) => {
          if (overlayTracker) overlayTracker.clearOverlays();
          overlayRef.close();
        },
        maxWidth: true,
      }
    );
    overlayTracker?.openOverlay(handle);
  }
}
