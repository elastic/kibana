/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState, useRef } from 'react';
import { Observable, Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInputPopover,
  EuiDualRange,
} from '@elastic/eui';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';
import { timeSliderReducers } from '../time_slider_reducers';
import { TimeSliderReduxState } from '../types';
import { TimeSliderPopoverButton } from './time_slider_popover_button';
import { TimeSliderPopoverContent } from './time_slider_popover_content';
import { FROM_INDEX, TO_INDEX } from '../time_utils';

import './index.scss';

export interface Props {
  formatDate: (epoch: number) => void;
  onChange: (value: [number, number]) => void;
  onNext: () => void;
  onPrevious: () => void;
  waitForPanelsToLoad$: Observable<void>;
}

export const TimeSlider: FC<Props> = (props) => {
  const {
    useEmbeddableDispatch,
    actions,
    useEmbeddableSelector: select,
  } = useReduxEmbeddableContext<TimeSliderReduxState, typeof timeSliderReducers>();
  const ticks = select((state) => {
    return state.componentState.ticks;
  });
  const timeRangeBounds = select((state) => {
    return state.componentState.timeRangeBounds;
  });
  const timeRangeMin = timeRangeBounds[FROM_INDEX];
  const timeRangeMax = timeRangeBounds[TO_INDEX];
  const value = select((state) => {
    return state.explicitInput.value;
  });

  const rangeRef = useRef<EuiDualRange>(null);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [timeoutId, setTimeoutId] = useState<number | undefined>(undefined);
  const [subscription, setSubscription] = useState<Subscription | undefined>(undefined);

  const togglePopover = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen, setIsPopoverOpen]);

  const onPanelResize = (width?: number) => {
    rangeRef.current?.onResize(width);
  };

  const playNextFrame = () => {
    // advance to next frame
    props.onNext();

    // use waitForPanelsToLoad$ observable to wait until next frame loaded
    // .pipe(first()) waits until the first value is emitted from an observable and then automatically unsubscribes
    const nextSubscription = props.waitForPanelsToLoad$
      .pipe(first((value) => value === true, false))
      .subscribe((ready: boolean) => {
        if (ready) {
          // use timeout to display frame for small time period before moving to next frame
          const nextTimeoutId = window.setTimeout(() => {
            playNextFrame();
          }, 1750);
          setTimeoutId(nextTimeoutId);
        }
      });
    setSubscription(nextSubscription);
  };

  const onPlay = () => {
    setIsPopoverOpen(true);
    setIsPaused(false);
    playNextFrame();
  };

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
  };

  const from = value ? value[FROM_INDEX] : timeRangeMin;
  const to = value ? value[TO_INDEX] : timeRangeMax;

  return (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          onClick={() => {
            onPause();
            props.onPrevious();
          }}
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
          onClick={() => {
            onPause();
            props.onNext();
          }}
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
          input={
            <TimeSliderPopoverButton
              onClick={togglePopover}
              formatDate={props.formatDate}
              from={from}
              to={to}
            />
          }
          isOpen={isPopoverOpen}
          closePopover={() => setIsPopoverOpen(false)}
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
            ticks={ticks}
            timeRangeMin={timeRangeMin}
            timeRangeMax={timeRangeMax}
          />
        </EuiInputPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
