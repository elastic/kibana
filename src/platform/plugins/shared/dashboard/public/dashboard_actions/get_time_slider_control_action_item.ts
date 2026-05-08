/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { map } from 'rxjs';

import { ACTION_CREATE_TIME_SLIDER, TIME_SLIDER_CONTROL } from '@kbn/controls-constants';
import { i18n } from '@kbn/i18n';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { triggers, type ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { DashboardApi } from '../dashboard_api/types';
import type { MenuItem } from '../dashboard_app/top_nav/add_panel_button/types';
import { uiActionsService } from '../services/kibana_services';

const timeSliderAddPanelDisabledTooltip = i18n.translate(
  'dashboard.addPanelFlyout.timeSliderOnlyOneTooltip',
  {
    defaultMessage: 'You can only add one time slider control per dashboard.',
  }
);

export async function getTimeSliderActionItem(api: DashboardApi): Promise<MenuItem | undefined> {
  try {
    const addPanelContext = {
      embeddable: {
        ...api,
        hasTimeSliderControl: () =>
          Object.values(api.layout$.getValue().pinnedPanels).some(
            (control) => control.type === TIME_SLIDER_CONTROL
          ),
        layoutChanged$: api.layout$.pipe(map(() => undefined)),
      },
      trigger: triggers[ADD_PANEL_TRIGGER],
    } as ActionExecutionContext;

    const timeSliderAction = await uiActionsService.getAction(ACTION_CREATE_TIME_SLIDER);
    const actionDisplayName = timeSliderAction.getDisplayName(addPanelContext);
    const isDisabled = !(await timeSliderAction.isCompatible(addPanelContext));

    return {
      id: timeSliderAction.id,
      name: actionDisplayName,
      icon: timeSliderAction.getIconType?.(addPanelContext) ?? 'empty',
      onClick: (event: React.MouseEvent) => {
        api.clearOverlays();
        if (event.currentTarget instanceof HTMLAnchorElement) {
          if (
            !event.defaultPrevented && // onClick prevented default
            event.button === 0 &&
            (!event.currentTarget.target || event.currentTarget.target === '_self') &&
            !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
          ) {
            event.preventDefault();
          }
        }
        timeSliderAction.execute(addPanelContext);
      },
      'data-test-subj': `create-action-${actionDisplayName}`,
      description: isDisabled
        ? timeSliderAddPanelDisabledTooltip
        : timeSliderAction?.getDisplayNameTooltip?.(addPanelContext),
      order: timeSliderAction.order ?? 0,
      isDisabled,
    };
  } catch (error) {
    return undefined; // silence error
  }
}
