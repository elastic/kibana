import React from 'react';
import type { DefaultPresentationPanelApi, PresentationPanelInternalProps } from './types';
export declare const PresentationPanelInternal: <ApiType extends DefaultPresentationPanelApi = DefaultPresentationPanelApi, ComponentPropsType extends {} = {}>({ Component, componentProps, setDragHandles, hidePanelChrome, ...rest }: PresentationPanelInternalProps<ApiType, ComponentPropsType>) => React.JSX.Element;
