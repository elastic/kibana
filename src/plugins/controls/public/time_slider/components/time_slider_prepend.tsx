/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useState } from 'react';
import { Observable, Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon } from '@elastic/eui';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';
import { timeSliderReducers } from '../time_slider_reducers';
import { TimeSliderReduxState } from '../types';

interface Props {
  onNext: () => void;
  onPrevious: () => void;
  waitForControlOutputConsumersToLoad$?: Observable<void>;
}

export const TimeSliderPrepend: FC<Props> = (props: Props) => {
  const { useEmbeddableDispatch, actions } = useReduxEmbeddableContext<
    TimeSliderReduxState,
    typeof timeSliderReducers
  >();
  const dispatch = useEmbeddableDispatch();

  const [isPaused, setIsPaused] = useState(true);
  const [timeoutId, setTimeoutId] = useState<number | undefined>(undefined);
  const [subscription, setSubscription] = useState<Subscription | undefined>(undefined);

  const playNextFrame = () => {
    // advance to next frame
    props.onNext();

    if (props.waitForControlOutputConsumersToLoad$) {
      const nextFrameSubscription = props.waitForControlOutputConsumersToLoad$
        .pipe(first())
        .subscribe(() => {
          // use timeout to display frame for small time period before moving to next frame
          const nextTimeoutId = window.setTimeout(() => {
            playNextFrame();
          }, 1750);
          setTimeoutId(nextTimeoutId);
        });
      setSubscription(nextFrameSubscription);
    }
  };

  const onPlay = () => {
    dispatch(actions.setIsOpen({ isOpen: true }));
    setIsPaused(false);
    playNextFrame();
  };

  const onPause = () => {
    dispatch(actions.setIsOpen({ isOpen: true }));
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

  return (
    <div>
      <EuiButtonIcon
        onClick={() => {
          onPause();
          props.onPrevious();
        }}
        iconType="framePrevious"
        color="text"
        aria-label={i18n.translate('controls.timeSlider.previousLabel', {
          defaultMessage: 'Previous time window',
        })}
        data-test-subj="timeSlider-previousTimeWindow"
      />
      {props.waitForControlOutputConsumersToLoad$ === undefined ? null : (
        <EuiButtonIcon
          className="timeSlider-playToggle"
          onClick={isPaused ? onPlay : onPause}
          iconType={isPaused ? 'playFilled' : 'pause'}
          size="s"
          display="fill"
          aria-label={
            isPaused
              ? i18n.translate('controls.timeSlider.playLabel', {
                  defaultMessage: 'Play',
                })
              : i18n.translate('controls.timeSlider.pauseLabel', {
                  defaultMessage: 'Pause',
                })
          }
        />
      )}
      <EuiButtonIcon
        onClick={() => {
          onPause();
          props.onNext();
        }}
        iconType="frameNext"
        color="text"
        aria-label={i18n.translate('controls.timeSlider.nextLabel', {
          defaultMessage: 'Next time window',
        })}
        data-test-subj="timeSlider-nextTimeWindow"
      />
    </div>
  );
};
