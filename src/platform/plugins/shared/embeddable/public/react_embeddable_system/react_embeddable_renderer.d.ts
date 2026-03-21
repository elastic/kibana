import React from 'react';
import type { HasSerializedChildState } from '@kbn/presentation-publishing';
import type { PresentationPanelProps } from '@kbn/presentation-panel-plugin/public';
import type { DefaultEmbeddableApi } from './types';
/**
 * Renders a component from the React Embeddable registry into a Presentation Panel.
 */
export declare const EmbeddableRenderer: <SerializedState extends object = object, Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>, ParentApi extends HasSerializedChildState<SerializedState> = HasSerializedChildState<SerializedState>>({ type, maybeId, getParentApi, panelProps, onApiAvailable, hidePanelChrome, }: {
    type: string;
    maybeId?: string;
    getParentApi: () => ParentApi;
    onApiAvailable?: (api: Api) => void;
    panelProps?: Pick<PresentationPanelProps<Api>, "showShadow" | "showBorder" | "showBadges" | "showNotifications" | "hideLoader" | "hideHeader" | "hideInspector" | "setDragHandles" | "getActions">;
    hidePanelChrome?: boolean;
}) => React.JSX.Element;
