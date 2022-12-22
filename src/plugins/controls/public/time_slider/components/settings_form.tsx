/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { FC } from 'react';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';
import { timeSliderReducers } from '../time_slider_reducers';
import { TimeSliderReduxState } from '../types';
import { getIsAnchored } from '../time_slider_selectors';

interface Props {
  value: [number, number];
  onChange: (value?: [number, number]) => void;
  timeRangeMin: number;
}

export const SettingsForm: FC = (props: Props) => {
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
    actions: { setIsAnchored },
  } = useReduxEmbeddableContext<TimeSliderReduxState, typeof timeSliderReducers>();
  const dispatch = useEmbeddableDispatch();
  const isAnchored = select(getIsAnchored);

  function onChange(e) {
    const newIsChecked = e.target.checked;
    if (newIsChecked) {
      props.onChange([props.timeRangeMin, props.value[1]]);
    }
    dispatch(setIsAnchored({ isAnchored: newIsChecked }));
  }

  return (
    <EuiFormRow display="columnCompressed">
      <EuiSwitch
        label={i18n.translate('controls.timeSlider.settings.anchorStartSwitchLabel', {
          defaultMessage: 'Anchor start',
        })}
        checked={isAnchored}
        onChange={onChange}
        compressed
      />
    </EuiFormRow>
  );
};
