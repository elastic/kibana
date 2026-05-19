import React from 'react';
import type { HasSerializedChildState } from '@kbn/presentation-publishing';
import type { DefaultEmbeddableApi, EmbeddableFactory } from './types';
import type { PhaseTracker } from './phase_tracker';
export declare function buildEmbeddable<SerializedState extends object = object, Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>>({ factory, maybeId, parentApi, phaseTracker, type, }: {
    factory?: EmbeddableFactory<SerializedState, Api>;
    maybeId?: string;
    parentApi: HasSerializedChildState<SerializedState>;
    phaseTracker: PhaseTracker;
    type: string;
}): Promise<{
    componentApi: Api;
    Component: React.FC<{}>;
} | {
    componentApi: Api;
    Component: () => React.JSX.Element;
}>;
