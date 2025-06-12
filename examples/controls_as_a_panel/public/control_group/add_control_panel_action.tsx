/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { embeddableExamplesGrouping } from '@kbn/embeddable-examples-plugin/public';
import { i18n } from '@kbn/i18n';
import { apiCanAddNewPanel } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { ADD_CONTROL_PANEL_ACTION_ID, CONTROL_PANEL_ID } from './constants';

export class AddControlPanelAction implements Action<EmbeddableApiContext> {
  public readonly type = ADD_CONTROL_PANEL_ACTION_ID;
  public readonly id = ADD_CONTROL_PANEL_ACTION_ID;
  public grouping = [embeddableExamplesGrouping];

  public getDisplayName() {
    return i18n.translate('controls.controlGroupPanel.displayName', {
      defaultMessage: 'Controls',
    });
  }

  public getIconType() {
    return 'controls';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return apiCanAddNewPanel(embeddable);
  }

  public async execute({ embeddable }: EmbeddableApiContext) {
    if (!apiCanAddNewPanel(embeddable)) throw new IncompatibleActionError();
    embeddable.addNewPanel({
      panelType: CONTROL_PANEL_ID,
      serializedState: {
        rawState: {
          controls: {
            first: { type: 'optionsList' },
            second: { type: 'rangeSlider' },
            third: { type: 'optionsList' },
            fourth: { type: 'optionsList' },
            fifth: { type: 'optionsList' },
            sixth: { type: 'rangeSlider' },
            seventh: { type: 'rangeSlider' },
            eighth: { width: 'optionsList' },
            ninth: { width: 'optionsList' },
            tenth: { width: 'optionsList' },
          },
        },
      },
    });
  }
}
