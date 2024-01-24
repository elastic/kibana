/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Action } from '@kbn/ui-actions-plugin/public';

import { Embeddable, ViewMode } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { VisualizeInput } from '@kbn/visualizations-plugin/public';

export const ACTION_DEPRECATION_BADGE = 'ACTION_INPUT_CONTROL_DEPRECATION_BADGE';

export interface DeprecationBadgeActionContext {
  embeddable: Embeddable<VisualizeInput>;
}

export class InputControlDeprecationBadge implements Action<DeprecationBadgeActionContext> {
  public id = ACTION_DEPRECATION_BADGE;
  public type = ACTION_DEPRECATION_BADGE;
  public disabled = true;

  public getDisplayName() {
    return i18n.translate('inputControl.deprecationBadgeAction.deprecationBadgeLabel', {
      defaultMessage: 'Deprecated',
    });
  }

  public getIconType() {
    return 'warning';
  }

  public getDisplayNameTooltip() {
    return i18n.translate('inputControl.deprecationBadgeAction.deprecationWarningDescription', {
      defaultMessage:
        'Input controls are deprecated and will be removed in a future release. Use the new Controls to filter and interact with your dashboard data.',
    });
  }

  public async isCompatible({ embeddable }: DeprecationBadgeActionContext) {
    return (
      embeddable.getInput().viewMode === ViewMode.EDIT &&
      embeddable.getInput()?.savedVis?.type === 'input_control_vis'
    );
  }

  public async execute() {
    // do nothing
    return;
  }
}
