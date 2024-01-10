/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { EditPanelAction, Embeddable, IEmbeddable } from '../../..';
import { ViewMode } from '../../../lib/types';
import { openCustomizePanelFlyout } from './open_customize_panel';
import { isTimeRangeCompatible, TimeRangeInput } from './time_range_helpers';

export const ACTION_CUSTOMIZE_PANEL = 'ACTION_CUSTOMIZE_PANEL';

export interface CustomizePanelActionContext {
  embeddable: IEmbeddable | Embeddable<TimeRangeInput>;
}

export class CustomizePanelAction implements Action<CustomizePanelActionContext> {
  public type = ACTION_CUSTOMIZE_PANEL;
  public id = ACTION_CUSTOMIZE_PANEL;
  public order = 40;

  constructor(protected readonly editPanel: EditPanelAction) {}

  public getDisplayName({ embeddable }: CustomizePanelActionContext): string {
    return i18n.translate('embeddableApi.customizePanel.action.displayName', {
      defaultMessage: 'Panel settings',
    });
  }

  public getIconType() {
    return 'gear';
  }

  public async isCompatible({ embeddable }: CustomizePanelActionContext) {
    // It should be possible to customize just the time range in View mode
    return (
      embeddable.getInput().viewMode === ViewMode.EDIT || isTimeRangeCompatible({ embeddable })
    );
  }

  public async execute({ embeddable }: CustomizePanelActionContext) {
    const isCompatible = await this.isCompatible({ embeddable });
    if (!isCompatible) {
      throw new IncompatibleActionError();
    }
    openCustomizePanelFlyout({ editPanel: this.editPanel, embeddable });
  }
}
