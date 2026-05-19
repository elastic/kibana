import React from 'react';
import type { PinnedControlLayoutState } from '@kbn/controls-schemas';
import type { ControlsRendererParentApi } from '../types';
export declare const ControlPanel: ({ parentApi, control: { id, grow, width, type }, setControlPanelRef, }: {
    parentApi: ControlsRendererParentApi;
    control: Required<PinnedControlLayoutState>;
    setControlPanelRef: (id: string, ref: HTMLElement | null) => void;
}) => React.JSX.Element;
