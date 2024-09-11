/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { EuiContextMenuItem } from '@elastic/eui';
import type { ControlGroupApi } from '@kbn/controls-plugin/public';
import { TIME_SLIDER_CONTROL } from '@kbn/controls-plugin/common';

import { apiHasType } from '@kbn/presentation-publishing';
import {
  getAddTimeSliderControlButtonTitle,
  getOnlyOneTimeSliderControlMsg,
} from '../../_dashboard_app_strings';
import { useDashboardAPI } from '../../dashboard_app';

interface Props {
  closePopover: () => void;
  controlGroupApi?: ControlGroupApi;
}

export const AddTimeSliderControlButton = ({ closePopover, controlGroupApi, ...rest }: Props) => {
  const [hasTimeSliderControl, setHasTimeSliderControl] = useState(false);
  const dashboard = useDashboardAPI();

  useEffect(() => {
    if (!controlGroupApi) {
      return;
    }

    const subscription = controlGroupApi.children$.subscribe((children) => {
      const nextHasTimeSliderControl = Object.values(children).some((controlApi) => {
        return apiHasType(controlApi) && controlApi.type === TIME_SLIDER_CONTROL;
      });
      setHasTimeSliderControl(nextHasTimeSliderControl);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [controlGroupApi]);

  return (
    <EuiContextMenuItem
      {...rest}
      icon="timeslider"
      onClick={async () => {
        controlGroupApi?.addNewPanel({
          panelType: TIME_SLIDER_CONTROL,
          initialState: {
            grow: true,
            width: 'large',
            id: uuidv4(),
          },
        });
        dashboard.scrollToTop();
        closePopover();
      }}
      data-test-subj="controls-create-timeslider-button"
      disabled={!controlGroupApi || hasTimeSliderControl}
      toolTipContent={hasTimeSliderControl ? getOnlyOneTimeSliderControlMsg() : null}
    >
      {getAddTimeSliderControlButtonTitle()}
    </EuiContextMenuItem>
  );
};
