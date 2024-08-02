/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { ViewMode } from '@kbn/presentation-publishing';
import { Observable } from 'rxjs';
import { TimeSliderStrings } from './time_slider_strings';

interface Props {
  onPlay: () => void;
  onPause: () => void;
  waitForControlOutputConsumersToLoad$?: Observable<void>;
  viewMode: ViewMode;
  disablePlayButton: boolean;
  isPaused: boolean;
}

export function PlayButton(props: Props) {
  if (
    props.waitForControlOutputConsumersToLoad$ === undefined ||
    (props.disablePlayButton && props.viewMode === 'view')
  ) {
    return null;
  }

  const Button = (
    <EuiButtonIcon
      className="timeSlider-playToggle"
      onClick={props.isPaused ? props.onPlay : props.onPause}
      disabled={props.disablePlayButton}
      iconType={props.isPaused ? 'playFilled' : 'pause'}
      size="s"
      display="fill"
      aria-label={TimeSliderStrings.control.getPlayButtonAriaLabel(props.isPaused)}
    />
  );
  return props.disablePlayButton ? (
    <EuiToolTip
      display="block"
      anchorClassName="timeSlider-playToggle"
      content={TimeSliderStrings.control.getPlayButtonDisabledTooltip()}
    >
      {Button}
    </EuiToolTip>
  ) : (
    Button
  );
}
