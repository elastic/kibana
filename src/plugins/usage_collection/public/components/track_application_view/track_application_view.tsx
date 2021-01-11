/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
 * @param props {@Link TrackApplicationViewProps}
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
