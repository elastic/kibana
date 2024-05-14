/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { apiHasInspectorAdapters, HasInspectorAdapters } from '@kbn/inspector-plugin/public';
import { tracksOverlays } from '@kbn/presentation-containers';
import {
  EmbeddableApiContext,
  getPanelTitle,
  PublishesPanelTitle,
  HasParentApi,
} from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { inspector } from '../../kibana_services';

export const ACTION_INSPECT_PANEL = 'openInspector';

export type InspectPanelActionApi = HasInspectorAdapters &
  Partial<PublishesPanelTitle & HasParentApi>;
const isApiCompatible = (api: unknown | null): api is InspectPanelActionApi => {
  return Boolean(api) && apiHasInspectorAdapters(api);
};

export class InspectPanelAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_INSPECT_PANEL;
  public readonly id = ACTION_INSPECT_PANEL;
  public order = 20;

  constructor() {}

  public getDisplayName() {
    return i18n.translate('presentationPanel.action.inspectPanel.displayName', {
      defaultMessage: 'Inspect',
    });
  }

  public getIconType() {
    return 'inspect';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) return false;
    return inspector.isAvailable(embeddable.getInspectorAdapters());
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    const adapters = embeddable.getInspectorAdapters();

    if (!(await this.isCompatible({ embeddable })) || adapters === undefined) {
      throw new IncompatibleActionError();
    }

    const panelTitle =
      getPanelTitle(embeddable) ||
      i18n.translate('presentationPanel.action.inspectPanel.untitledEmbeddableFilename', {
        defaultMessage: '[No Title]',
      });
    const session = inspector.open(adapters, {
      title: panelTitle,
      options: {
        fileName: panelTitle,
      },
    });
    session.onClose.finally(() => {
      if (tracksOverlays(embeddable.parentApi)) embeddable.parentApi.clearOverlays();
    });

    // send the overlay ref to the parent API if it is capable of tracking overlays
    if (tracksOverlays(embeddable.parentApi)) embeddable.parentApi?.openOverlay(session);
  }
}
