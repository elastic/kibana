/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component, ReactNode, useCallback, useState } from 'react';
import moment from 'moment-timezone';
import {
  EuiText,
  EuiLoadingSpinner,
  EuiInputPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
  EuiToolTip,
  EuiButtonIcon,
} from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';
import { timeSliderReducers } from './time_slider_reducers';
import { TimeSliderReduxState } from './types';

export interface Props {
  dateFormat?: string;
  timezone?: string;
}

export const TimeSliderComponent: FC<Props> = (props) => {
  const defaultProps = {
    dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
    timezone: 'Browser',
    ...props,
  };
  const { range, value, timezone, dateFormat, fieldName, ignoreValidation } = defaultProps;

  // Redux embeddable Context
  const {
    useEmbeddableDispatch,
    actions,
    useEmbeddableSelector: select,
  } = useReduxEmbeddableContext<TimeSliderReduxState, typeof timeSliderReducers>();
  //const dispatch = useEmbeddableDispatch();

  const timeRange = select((state) => {
    console.log(state);
    return state.explicitInput.timeRange;
  });
  console.log(timeRange);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen, setIsPopoverOpen]);

  const getTimezone = useCallback(() => {
    const detectedTimezone = moment.tz.guess();

    return timezone === 'Browser' ? detectedTimezone : timezone;
  }, [timezone]);

  const epochToKbnDateFormat = useCallback(
    (epoch: number) => {
      const tz = getTimezone();
      return moment.tz(epoch, tz).format(dateFormat);
    },
    [dateFormat, getTimezone]
  );

  const button = (
    <button
      color="text"
      onClick={togglePopover}
    >
      <EuiText className="eui-textTruncate" size="s">
        <span>start</span>
        &nbsp;&nbsp;→&nbsp;&nbsp;
        <span>end</span>
      </EuiText>
    </button>
  );
  

  return (
    <EuiInputPopover
      input={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="s"
      anchorPosition="downCenter"
      disableFocusTrap
      attachToAnchor={false}
    >
      <div>slider goes here</div>
    </EuiInputPopover>
  );
};
