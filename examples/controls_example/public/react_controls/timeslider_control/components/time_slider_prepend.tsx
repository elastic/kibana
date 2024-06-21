/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButtonIcon } from '@elastic/eui';
import React, { FC, useCallback, useState } from 'react';
import { Observable, Subscription } from 'rxjs';
import { first } from 'rxjs';
import { ViewMode } from '@kbn/presentation-publishing';
import { TimeSliderStrings } from './time_slider_strings';
import { PlayButton } from './play_button';

interface Props {
  onNext: () => void;
  onPrevious: () => void;
  waitForControlOutputConsumersToLoad$?: Observable<void>;
  viewMode: ViewMode;
  disablePlayButton: boolean;
  setIsPopoverOpen: (isPopoverOpen: boolean) => void;
}

export const TimeSliderPrepend: FC<Props> = (props: Props) => {
  const [isPaused, setIsPaused] = useState(true);
  const [timeoutId, setTimeoutId] = useState<number | undefined>(undefined);
  const [subscription, setSubscription] = useState<Subscription | undefined>(undefined);

  const playNextFrame = useCallback(() => {
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
  }, [props]);

  const onPlay = useCallback(() => {
    props.setIsPopoverOpen(true);
    setIsPaused(false);
    playNextFrame();
  }, [props, playNextFrame]);

  const onPause = useCallback(() => {
    props.setIsPopoverOpen(true);
    setIsPaused(true);
    if (subscription) {
      subscription.unsubscribe();
      setSubscription(undefined);
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(undefined);
    }
  }, [props, subscription, timeoutId]);

  return (
    <div>
      <EuiButtonIcon
        onClick={() => {
          onPause();
          props.onPrevious();
        }}
        iconType="framePrevious"
        color="text"
        aria-label={TimeSliderStrings.control.getPreviousButtonAriaLabel()}
        data-test-subj="timeSlider-previousTimeWindow"
      />
      <PlayButton
        onPlay={onPlay}
        onPause={onPause}
        waitForControlOutputConsumersToLoad$={props.waitForControlOutputConsumersToLoad$}
        viewMode={props.viewMode}
        disablePlayButton={props.disablePlayButton}
        isPaused={isPaused}
      />
      <EuiButtonIcon
        onClick={() => {
          onPause();
          props.onNext();
        }}
        iconType="frameNext"
        color="text"
        aria-label={TimeSliderStrings.control.getNextButtonAriaLabel()}
        data-test-subj="timeSlider-nextTimeWindow"
      />
    </div>
  );
};
