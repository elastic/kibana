/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { HasInspectorAdapters } from '@kbn/inspector-plugin/public';
import { apiHasInspectorAdapters } from '@kbn/inspector-plugin/public';
import type {
  EmbeddableApiContext,
  PublishesTitle,
  HasParentApi,
} from '@kbn/presentation-publishing';
import { getTitle, apiHasUniqueId } from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { ACTION_INSPECT_PANEL } from './constants';
import { inspector } from '../../kibana_services';

export type InspectPanelActionApi = HasInspectorAdapters & Partial<PublishesTitle & HasParentApi>;
const isApiCompatible = (api: unknown | null): api is InspectPanelActionApi => {
  return Boolean(api) && apiHasInspectorAdapters(api);
};

export class InspectPanelAction implements Action<EmbeddableApiContext> {
  public readonly type = ACTION_INSPECT_PANEL;
  public readonly id = ACTION_INSPECT_PANEL;
  public order = 19; // right after Explore in Discover which is 20

  constructor() {}

  public getDisplayName() {
    return i18n.translate('presentationPanel.action.inspectPanel.displayName', {
      defaultMessage: 'Inspect',
    });
  }

  public getIconType = () => 'inspect';

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
      getTitle(embeddable) ||
      i18n.translate('presentationPanel.action.inspectPanel.untitledEmbeddableFilename', {
        defaultMessage: '[No Title]',
      });

    inspector.open(
      adapters,
      {
        title: panelTitle,
        options: {
          fileName: panelTitle,
        },
        flyoutProps: {
          type: 'push',
          focusedPanelId: apiHasUniqueId(embeddable) ? embeddable.uuid : undefined,
        },
      },
      embeddable.parentApi
    );
  }
}
