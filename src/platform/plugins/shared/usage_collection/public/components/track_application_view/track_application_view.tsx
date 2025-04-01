/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, FC } from 'react';
import { TrackApplicationViewComponent } from './track_application_view_component';
import { IApplicationUsageTracker } from '../../plugin';
import { TrackApplicationViewProps } from './types';

export const ApplicationUsageContext = createContext<IApplicationUsageTracker | undefined>(
  undefined
);

/**
 * React component to track the number of clicks and minutes on screen of the children components.
 * @param props {@link TrackApplicationViewProps}
 * @constructor
 */
export const TrackApplicationView: FC<TrackApplicationViewProps> = (props) => {
  return (
    <ApplicationUsageContext.Consumer>
      {(value) => {
        const propsWithTracker = { ...props, applicationUsageTracker: value };
        return <TrackApplicationViewComponent {...propsWithTracker} />;
      }}
    </ApplicationUsageContext.Consumer>
  );
};
