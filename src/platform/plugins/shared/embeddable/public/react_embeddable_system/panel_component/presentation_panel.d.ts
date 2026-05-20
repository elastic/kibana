import React from 'react';
import type { DefaultPresentationPanelApi, PresentationPanelProps } from './types';
export declare const PresentationPanel: <ApiType extends DefaultPresentationPanelApi = DefaultPresentationPanelApi, ComponentPropsType extends {} = {}>({ Component, componentApi, componentProps, setDragHandles, hidePanelChrome, ...rest }: PresentationPanelProps<ApiType, ComponentPropsType>) => React.JSX.Element;
