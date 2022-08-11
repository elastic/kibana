/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import React, { Component, ReactNode, useCallback, useEffect, useState } from 'react';
import { Observable, Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInputPopover,
} from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';
import { timeSliderReducers } from '../time_slider_reducers';
import { TimeSliderReduxState } from '../types';
import { TimeSliderPopoverButton } from './time_slider_popover_button';
import { TimeSliderPopoverContent } from './time_slider_popover_content';
import { getInterval, getTicks } from './time_utils';

import './index.scss';

const FROM_INDEX = 0;
const TO_INDEX = 1;

export interface Props {
  dateFormat?: string;
  timezone?: string;
  waitForPanelsToLoad$: Observable<void>;
}

export const TimeSlider: FC<Props> = (props) => {
  const defaultProps = {
    dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
    timezone: 'Browser',
    ...props,
  };
  const { timezone, dateFormat } = defaultProps;

  const {
    useEmbeddableDispatch,
    actions,
    useEmbeddableSelector: select,
  } = useReduxEmbeddableContext<TimeSliderReduxState, typeof timeSliderReducers>();
  const dispatch = useEmbeddableDispatch();

  const dispatchPublishChange = _.debounce((value: [number, number]) => {
    dispatch(actions.publishValue({ value }));
  }, 500);

  const dispatchChange = (value: [number, number]) => {
    console.log('new value: ', value);
    dispatch(actions.setValue({ value }));
    dispatchPublishChange(value);
  };

  const timeRangeBounds = select((state) => {
    return state.componentState.timeRangeBounds;
  });
  const timeRangeMin = timeRangeBounds[FROM_INDEX];
  const timeRangeMax = timeRangeBounds[TO_INDEX];
  const myValue = select((state) => {
    return state.explicitInput.value;
  });
  console.log('value: ', myValue);

  const getTimezone = useCallback(() => {
    const detectedTimezone = moment.tz.guess();

    return timezone === 'Browser' ? detectedTimezone : timezone;
  }, [timezone]);
  
  const interval = getInterval(timeRangeMin, timeRangeMax);
  const [range, setRange] = useState(interval);
  const [ticks, setTicks] = useState([]);
  useEffect(() => {
    setTicks(getTicks(timeRangeMin, timeRangeMax, interval, getTimezone()));
  }, [interval, getTimezone]);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen, setIsPopoverOpen]);

  const [isPaused, setIsPaused] = useState(true);
  const [timeoutId, setTimeoutId] = useState<number | undefined>(undefined);
  const [subscription, setSubscription] = useState<Subscription | undefined>(undefined);

  const epochToKbnDateFormat = useCallback(
    (epoch: number) => {
      const tz = getTimezone();
      return moment.tz(epoch, tz).format(dateFormat);
    },
    [dateFormat, getTimezone]
  );

  const onRangeSliderChange = useCallback(
    (value: [number, number]) => {
      setRange(value[TO_INDEX] - value[FROM_INDEX]);
      dispatchChange(value)
    },
    []
  );

  const onNext = () => {
    console.log('onNext: current value: ', myValue);
    setIsPopoverOpen(true);
    const from = myValue === undefined || myValue[TO_INDEX] === timeRangeMax
      ? ticks[0].value
      : myValue[TO_INDEX];
    const to = from + range;
    dispatchChange([from, Math.min(to, timeRangeMax)]);
  }

  const onPrevious = useCallback(
    () => {
      setIsPopoverOpen(true);
      const to = myValue === undefined || myValue[FROM_INDEX] === timeRangeMin
        ? ticks[ticks.length - 1].value
        : myValue[FROM_INDEX];
      const from = to - range;
      dispatchChange([Math.max(from, timeRangeMin), to]);
    },
    [ticks, timeRangeMin, myValue]
  );

  const playNextFrame = () => {
    // advance to next frame
    onNext();

    // use waitForPanelsToLoad$ observable to wait until next frame loaded
    // .pipe(first()) waits until the first value is emitted from an observable and then automatically unsubscribes
    const nextSubscription = props.waitForPanelsToLoad$.pipe(first()).subscribe(() => {
      // use timeout to display frame for small time period before moving to next frame
      const nextTimeoutId = window.setTimeout(() => {
        playNextFrame();
      }, 1750);
      setTimeoutId(nextTimeoutId);
    });
    setSubscription(nextSubscription);
  }

  const onPlay = () => {
    setIsPopoverOpen(true);
    setIsPaused(false);
    playNextFrame();
  }

  const onPause = () => {
    setIsPopoverOpen(true);
    setIsPaused(true);
    if (subscription) {
      subscription.unsubscribe();
      setSubscription(undefined);
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(undefined);
    }
  }

  const from = myValue ? myValue[FROM_INDEX] : timeRangeMin;
  const to = myValue ? myValue[TO_INDEX] : timeRangeMax;
  
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          onClick={onPrevious}
          iconType="framePrevious"
          color="text"
          aria-label={i18n.translate('xpack.maps.timeslider.previousTimeWindowLabel', {
            defaultMessage: 'Previous time window',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          className="mapTimeslider__playButton"
          onClick={isPaused ? onPlay : onPause}
          iconType={isPaused ? 'playFilled' : 'pause'}
          size="s"
          display="fill"
          aria-label={
            isPaused
              ? i18n.translate('xpack.maps.timeslider.playLabel', {
                  defaultMessage: 'Play',
                })
              : i18n.translate('xpack.maps.timeslider.pauseLabel', {
                  defaultMessage: 'Pause',
                })
          }
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          onClick={onNext}
          iconType="frameNext"
          color="text"
          aria-label={i18n.translate('xpack.maps.timeslider.nextTimeWindowLabel', {
            defaultMessage: 'Next time window',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <EuiInputPopover
          className="timeSlider__popoverOverride"
          input={<TimeSliderPopoverButton onClick={togglePopover} formatDate={epochToKbnDateFormat} from={from} to={to} />}
          isOpen={isPopoverOpen}
          closePopover={() => setIsPopoverOpen(false)}
          panelPaddingSize="s"
          anchorPosition="downCenter"
          disableFocusTrap
          attachToAnchor={false}
        >
          <TimeSliderPopoverContent
            key={`${timeRangeMin}_${timeRangeMax}`} // force new instance when time range changes to reset local state
            value={[from, to]}
            onChange={onRangeSliderChange}
            ticks={ticks}
            timeRangeMin={timeRangeMin}
            timeRangeMax={timeRangeMax}
          />
        </EuiInputPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
