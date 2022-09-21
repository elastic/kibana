/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import type { ControlInput } from '../../types';
import { TIME_SLIDER_CONTROL } from '../../time_slider/types';

interface Props {
  addNewEmbeddable: (type: string, input: Omit<ControlInput, 'id'>) => void;
  closePopover?: () => void;
  hasTimeSliderControl: boolean;
}

export const CreateTimeSliderControlButton = ({
  addNewEmbeddable,
  closePopover,
  hasTimeSliderControl,
}: Props) => {
  return (
    <EuiContextMenuItem
      icon="plusInCircle"
      onClick={() => {
        addNewEmbeddable(TIME_SLIDER_CONTROL, {
          title: i18n.translate('controls.controlGroup.timeSlider.title', {
            defaultMessage: 'Time slider',
          }),
        });
        if (closePopover) {
          closePopover();
        }
      }}
      data-test-subj="controls-create-timeslider-button"
      disabled={hasTimeSliderControl}
      toolTipContent={
        hasTimeSliderControl
          ? i18n.translate('controls.controlGroup.onlyOneTimeSliderControlMsg', {
              defaultMessage: 'Control group already contains time slider control.',
            })
          : null
      }
    >
      {i18n.translate('controls.controlGroup.addTimeSliderControlButtonTitle', {
        defaultMessage: 'Add time slider control',
      })}
    </EuiContextMenuItem>
  );
};
