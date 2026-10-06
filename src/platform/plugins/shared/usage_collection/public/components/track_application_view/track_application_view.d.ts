import type { FC } from 'react';
import React from 'react';
import type { IApplicationUsageTracker } from '../../plugin';
import type { TrackApplicationViewProps } from './types';
export declare const ApplicationUsageContext: React.Context<IApplicationUsageTracker | undefined>;
/**
 * React component to track the number of clicks and minutes on screen of the children components.
 * @param props {@link TrackApplicationViewProps}
 * @constructor
 */
export declare const TrackApplicationView: FC<TrackApplicationViewProps>;
