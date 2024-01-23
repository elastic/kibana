/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { PrettyDuration } from '@elastic/eui';
import { renderToString } from 'react-dom/server';
import { Action } from '@kbn/ui-actions-plugin/public';

import { EditPanelAction, Embeddable } from '../../..';
import { doesInheritTimeRange } from './does_inherit_time_range';
import { CustomizePanelAction } from './customize_panel_action';
import { hasTimeRange, TimeRangeInput } from './time_range_helpers';

export const CUSTOM_TIME_RANGE_BADGE = 'CUSTOM_TIME_RANGE_BADGE';

export interface TimeBadgeActionContext {
  embeddable: Embeddable<TimeRangeInput>;
}

export class CustomTimeRangeBadge
  extends CustomizePanelAction
  implements Action<TimeBadgeActionContext>
{
  public readonly type = CUSTOM_TIME_RANGE_BADGE;
  public readonly id = CUSTOM_TIME_RANGE_BADGE;
  public order = 7;

  constructor(
    protected readonly editPanel: EditPanelAction,
    protected readonly dateFormat?: string
  ) {
    super(editPanel);
  }

  public getDisplayName({ embeddable }: TimeBadgeActionContext) {
    return renderToString(
      <PrettyDuration
        timeFrom={embeddable.getInput().timeRange.from}
        timeTo={embeddable.getInput().timeRange.to}
        dateFormat={this.dateFormat ?? 'Browser'}
      />
    );
  }

  public getIconType() {
    return 'calendar';
  }

  public async isCompatible({ embeddable }: TimeBadgeActionContext) {
    return Boolean(embeddable && hasTimeRange(embeddable) && !doesInheritTimeRange(embeddable));
  }
}
