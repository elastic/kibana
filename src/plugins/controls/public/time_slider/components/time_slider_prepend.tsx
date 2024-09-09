/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/common';
import React, { FC, useCallback, useMemo, useState } from 'react';
import { Observable, Subscription } from 'rxjs';
import { first } from 'rxjs';
import { useControlGroupContainer } from '../../control_group/embeddable/control_group_container';
import { useTimeSlider } from '../embeddable/time_slider_embeddable';
import { TimeSliderStrings } from './time_slider_strings';

interface Props {
  onNext: () => void;
  onPrevious: () => void;
  waitForControlOutputConsumersToLoad$?: Observable<void>;
}

export const TimeSliderPrepend: FC<Props> = (props: Props) => {
  const timeSlider = useTimeSlider();
  const controlGroup = useControlGroupContainer();

  const showApplySelectionsButton = controlGroup.select(
    (state) => state.explicitInput.showApplySelections
  );
  const viewMode = controlGroup.select((state) => state.explicitInput.viewMode);

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
    timeSlider.dispatch.setIsOpen({ isOpen: true });
    setIsPaused(false);
    playNextFrame();
  }, [timeSlider.dispatch, playNextFrame]);

  const onPause = useCallback(() => {
    timeSlider.dispatch.setIsOpen({ isOpen: true });
    setIsPaused(true);
    if (subscription) {
      subscription.unsubscribe();
      setSubscription(undefined);
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(undefined);
    }
  }, [timeSlider.dispatch, subscription, timeoutId]);

  const PlayButton = useMemo(() => {
    const Button = (
      <EuiButtonIcon
        className="timeSlider-playToggle"
        onClick={isPaused ? onPlay : onPause}
        disabled={showApplySelectionsButton}
        iconType={isPaused ? 'playFilled' : 'pause'}
        size="s"
        display="fill"
        aria-label={TimeSliderStrings.control.getPlayButtonAriaLabel(isPaused)}
      />
    );
    return (
      <>
        {showApplySelectionsButton ? (
          <EuiToolTip content={TimeSliderStrings.control.getPlayButtonDisabledTooltip()}>
            {Button}
          </EuiToolTip>
        ) : (
          Button
        )}
      </>
    );
  }, [isPaused, onPlay, onPause, showApplySelectionsButton]);

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
      {props.waitForControlOutputConsumersToLoad$ === undefined ||
      (showApplySelectionsButton && viewMode === ViewMode.VIEW)
        ? null
        : PlayButton}
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
