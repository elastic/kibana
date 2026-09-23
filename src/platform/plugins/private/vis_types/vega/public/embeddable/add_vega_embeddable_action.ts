/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { ADD_PANEL_VISUALIZATION_GROUP } from '@kbn/embeddable-plugin/public';
import { openLazySystemFlyout } from '@kbn/presentation-util';
import {
  apiCanAddNewPanel,
  apiIsPresentationContainer,
  type EmbeddableApiContext,
} from '@kbn/presentation-publishing';
import type { Action, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { VEGA_EMBEDDABLE_TYPE } from '../../common/constants';
import type { VegaByValueState } from '../../server';
import { ADD_VEGA_EMBEDDABLE_ACTION_ID } from '../constants';
import { getDefaultSpec } from '../default_spec';
import { VegaPanelIcon } from '../vega_icon';
import {
  createVegaEditorMenuManager,
  createVegaEditorMenuServices,
} from './vega_editor_menu_session';
import type { VegaEmbeddableApi } from './vega_embeddable';

export class AddVegaEmbeddableAction implements Action<EmbeddableApiContext> {
  public readonly type = ADD_VEGA_EMBEDDABLE_ACTION_ID;
  public readonly id = ADD_VEGA_EMBEDDABLE_ACTION_ID;
  public order = 0;
  public grouping = [ADD_PANEL_VISUALIZATION_GROUP];

  constructor(
    private readonly core: CoreStart,
    private readonly uiActions: Pick<UiActionsStart, 'getAction'>
  ) {}

  public getIconType() {
    return VegaPanelIcon;
  }

  public getDisplayName() {
    return 'Vega';
  }

  public getDisplayNameTooltip() {
    return i18n.translate('visTypeVega.dashboard.addPanelActionDescription', {
      defaultMessage: 'Use the Vega syntax to create new types of visualizations.',
      description: 'Vega and Vega-Lite are product names and should not be translated',
    });
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return apiCanAddNewPanel(embeddable);
  }

  public async execute({ embeddable, returnFocus }: EmbeddableApiContext) {
    if (!apiCanAddNewPanel(embeddable)) throw new IncompatibleActionError();
    const menuManager = createVegaEditorMenuManager(
      createVegaEditorMenuServices(this.core, this.uiActions)
    );
    let closed = false;
    const flyoutRef = openLazySystemFlyout({
      core: this.core,
      parentApi: embeddable,
      returnFocus,
      flyoutProps: {
        size: 'm',
        id: menuManager.flyoutId,
        historyKey: menuManager.historyKey,
        flyoutMenuProps: menuManager.flyoutMenuProps,
      },
      loadContent: async ({ ariaLabelledBy, closeFlyout }) => {
        const panel = await embeddable.addNewPanel<VegaByValueState, VegaEmbeddableApi>({
          panelType: VEGA_EMBEDDABLE_TYPE,
          serializedState: { spec: { format: 'hjson', value: getDefaultSpec() } },
        });
        if (!panel) return;
        if (closed) {
          if (apiIsPresentationContainer(embeddable)) embeddable.removePanel(panel.uuid);
          return;
        }
        return panel.renderEditor({
          ariaLabelledBy,
          closeFlyout,
          isNewPanel: true,
          menuManager,
        });
      },
    });
    void flyoutRef.onClose.then(() => {
      closed = true;
      menuManager.dispose();
    });
  }
}
