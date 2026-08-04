import React from 'react';
import type { HasSerializedChildState } from '@kbn/presentation-publishing';
import type { PresentationPanelProps } from './panel_component/types';
import type { DefaultEmbeddableApi } from './types';
/**
 * Renders a component from the React Embeddable registry into a Presentation Panel.
 */
export declare const EmbeddableRenderer: <SerializedState extends object = object, Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>, ParentApi extends HasSerializedChildState<SerializedState> = HasSerializedChildState<SerializedState>>({ type, maybeId, getParentApi, panelProps, onApiAvailable, hidePanelChrome, }: {
    type: string;
    maybeId?: string;
    getParentApi: () => ParentApi;
    onApiAvailable?: (api: Api) => void;
    panelProps?: Omit<PresentationPanelProps<Api>, "Component" | "componentApi">;
    hidePanelChrome?: boolean;
}) => React.JSX.Element | null;
