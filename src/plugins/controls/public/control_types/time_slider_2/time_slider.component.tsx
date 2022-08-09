/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';

export interface TimeSliderProps {
  id: string;
  range?: [number | undefined, number | undefined];
  value: [number | null, number | null];
  onChange: () => void;
  dateFormat?: string;
  timezone?: string;
}

export const TimeSlider: FC<TimeSliderProps> = (props) => {
  const defaultProps = {
    dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
    ignoreValidation: false,
    timezone: 'Browser',
    ...props,
  };

  return (
    <>
      <p>Time slider UI goes here</p>
    </>
  );
};
