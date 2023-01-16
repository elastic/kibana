/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';

interface Props {
  onClick: () => void;
  formatDate: (epoch: number) => string;
  from: number;
  to: number;
}

export function TimeSliderPopoverButton(props: Props) {
  return (
    <button
      className="timeSlider__anchor eui-textTruncate"
      color="text"
      onClick={props.onClick}
      data-test-subj="timeSlider-popoverToggleButton"
    >
      <EuiText className="eui-textTruncate" size="s">
        <span>{props.formatDate(props.from)}</span>
        &nbsp;&nbsp;→&nbsp;&nbsp;
        <span>{props.formatDate(props.to)}</span>
      </EuiText>
    </button>
  );
}
