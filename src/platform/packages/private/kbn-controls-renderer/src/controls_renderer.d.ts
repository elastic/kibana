import { default as React } from 'react';
import type { ControlsLayout, ControlsRendererParentApi } from './types';
export declare const ControlsRenderer: ({ controls: controlState, onControlsChanged, parentApi, }: {
    controls: ControlsLayout;
    onControlsChanged: (controls: ControlsLayout) => void;
    parentApi: ControlsRendererParentApi;
}) => React.JSX.Element | null;
