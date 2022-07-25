/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Action } from '@kbn/ui-actions-plugin/public';
import { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import { IEmbeddable } from '../../../embeddables';

export const ACTION_INSPECT_PANEL = 'openInspector';

interface ActionContext {
  embeddable: IEmbeddable;
}

export class InspectPanelAction implements Action<ActionContext> {
  public readonly type = ACTION_INSPECT_PANEL;
  public readonly id = ACTION_INSPECT_PANEL;
  public order = 20;

  constructor(private readonly inspector: InspectorStartContract) {}

  public getDisplayName() {
    return i18n.translate('embeddableApi.panel.inspectPanel.displayName', {
      defaultMessage: 'Inspect',
    });
  }

  public getIconType() {
    return 'inspect';
  }

  public async isCompatible({ embeddable }: ActionContext) {
    return this.inspector.isAvailable(embeddable.getInspectorAdapters());
  }

  public async execute({ embeddable }: ActionContext) {
    const adapters = embeddable.getInspectorAdapters();

    if (!(await this.isCompatible({ embeddable })) || adapters === undefined) {
      throw new Error('Action not compatible with context');
    }
    const session = this.inspector.open(adapters, {
      title: embeddable.getTitle(),
      options: {
        fileName:
          embeddable.getTitle() || // pick the visible title
          embeddable.getInput().title || // or the custom title if used, but currently hidden
          embeddable.getOutput().defaultTitle || // or the saved title
          // in the very last resort use "untitled"
          i18n.translate('embeddableApi.panel.inspectPanel.untitledEmbeddableFilename', {
            defaultMessage: 'untitled',
          }),
      },
    });
    // Overwrite the embeddables.destroy() function to close the inspector
    // before calling the original destroy method
    const originalDestroy = embeddable.destroy;
    embeddable.destroy = () => {
      session.close();
      if (originalDestroy) {
        originalDestroy.call(embeddable);
      }
    };
    // In case the inspector gets closed (otherwise), restore the original destroy function
    session.onClose.finally(() => {
      embeddable.destroy = originalDestroy;
    });
  }
}
