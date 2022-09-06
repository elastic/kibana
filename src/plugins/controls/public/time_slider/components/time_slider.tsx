/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useRef } from 'react';
import { EuiInputPopover, EuiDualRange } from '@elastic/eui';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';
import { timeSliderReducers } from '../time_slider_reducers';
import { TimeSliderReduxState } from '../types';
import { TimeSliderPopoverButton } from './time_slider_popover_button';
import { TimeSliderPopoverContent } from './time_slider_popover_content';
import { FROM_INDEX, TO_INDEX } from '../time_utils';

import './index.scss';

interface Props {
  formatDate: (epoch: number) => string;
  onChange: (value?: [number, number]) => void;
}

export const TimeSlider: FC<Props> = (props: Props) => {
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
    actions,
  } = useReduxEmbeddableContext<TimeSliderReduxState, typeof timeSliderReducers>();
  const dispatch = useEmbeddableDispatch();
  const ticks = select((state) => {
    return state.componentState.ticks;
  });
  const timeRangeBounds = select((state) => {
    return state.componentState.timeRangeBounds;
  });
  const timeRangeMin = timeRangeBounds[FROM_INDEX];
  const timeRangeMax = timeRangeBounds[TO_INDEX];
  const value = select((state) => {
    return state.componentState.value;
  });
  const isOpen = select((state) => {
    return state.componentState.isOpen;
  });

  const rangeRef = useRef<EuiDualRange>(null);

  const onPanelResize = (width?: number) => {
    rangeRef.current?.onResize(width);
  };

  const from = value ? value[FROM_INDEX] : timeRangeMin;
  const to = value ? value[TO_INDEX] : timeRangeMax;

  return (
    <EuiInputPopover
      className="timeSlider__popoverOverride"
      anchorClassName="timeSlider__anchorOverride"
      panelClassName="timeSlider__panelOverride"
      input={
        <TimeSliderPopoverButton
          onClick={() => {
            dispatch(actions.setIsOpen({ isOpen: !isOpen }));
          }}
          formatDate={props.formatDate}
          from={from}
          to={to}
        />
      }
      isOpen={isOpen}
      closePopover={() => dispatch(actions.setIsOpen({ isOpen: false }))}
      panelPaddingSize="s"
      anchorPosition="downCenter"
      disableFocusTrap
      attachToAnchor={false}
      onPanelResize={onPanelResize}
    >
      <TimeSliderPopoverContent
        rangeRef={rangeRef}
        value={[from, to]}
        onChange={props.onChange}
        onClear={() => {
          props.onChange([timeRangeMin, timeRangeMax]);
        }}
        ticks={ticks}
        timeRangeMin={timeRangeMin}
        timeRangeMax={timeRangeMax}
      />
    </EuiInputPopover>
  );
};
