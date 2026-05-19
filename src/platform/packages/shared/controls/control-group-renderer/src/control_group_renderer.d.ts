import React from 'react';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { type ViewMode } from '@kbn/presentation-publishing';
import type { ControlGroupCreationOptions, ControlGroupRendererApi, ControlGroupRuntimeState, ControlGroupStateBuilder } from './types';
export interface ControlGroupRendererProps {
    onApiAvailable: (api: ControlGroupRendererApi) => void;
    getCreationOptions: (initialState: ControlGroupRuntimeState, builder: ControlGroupStateBuilder) => Promise<Partial<ControlGroupCreationOptions>>;
    viewMode?: ViewMode;
    filters?: Filter[];
    timeRange?: TimeRange;
    query?: Query;
    dataLoading?: boolean;
    compressed?: boolean;
}
export declare const ControlGroupRenderer: ({ onApiAvailable, getCreationOptions, filters, timeRange, query, viewMode, dataLoading, compressed, }: ControlGroupRendererProps) => React.JSX.Element | null;
