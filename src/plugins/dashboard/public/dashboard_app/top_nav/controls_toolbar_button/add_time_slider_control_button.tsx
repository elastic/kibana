/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { ControlGroupContainer, TIME_SLIDER_CONTROL } from '@kbn/controls-plugin/public';
import {
  getAddTimeSliderControlButtonTitle,
  getOnlyOneTimeSliderControlMsg,
} from '../../_dashboard_app_strings';
import { useDashboardAPI } from '../../dashboard_app';

interface Props {
  closePopover: () => void;
  controlGroup: ControlGroupContainer;
}

export const AddTimeSliderControlButton = ({ closePopover, controlGroup, ...rest }: Props) => {
  const [hasTimeSliderControl, setHasTimeSliderControl] = useState(false);
  const dashboard = useDashboardAPI();

  useEffect(() => {
    const subscription = controlGroup.getInput$().subscribe(() => {
      const childIds = controlGroup.getChildIds();
      const nextHasTimeSliderControl = childIds.some((id: string) => {
        const child = controlGroup.getChild(id);
        return child.type === TIME_SLIDER_CONTROL;
      });
      if (nextHasTimeSliderControl !== hasTimeSliderControl) {
        setHasTimeSliderControl(nextHasTimeSliderControl);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [controlGroup, hasTimeSliderControl, setHasTimeSliderControl]);

  return (
    <EuiContextMenuItem
      {...rest}
      icon="plusInCircle"
      onClick={async () => {
        await controlGroup.addTimeSliderControl();
        dashboard.scrollToTop();
        closePopover();
      }}
      data-test-subj="controls-create-timeslider-button"
      disabled={hasTimeSliderControl}
      toolTipContent={hasTimeSliderControl ? getOnlyOneTimeSliderControlMsg() : null}
    >
      {getAddTimeSliderControlButtonTitle()}
    </EuiContextMenuItem>
  );
};
