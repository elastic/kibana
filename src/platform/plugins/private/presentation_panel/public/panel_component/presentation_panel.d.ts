import React from 'react';
import type { DefaultPresentationPanelApi, PresentationPanelProps } from './types';
export declare const PresentationPanel: <ApiType extends DefaultPresentationPanelApi = DefaultPresentationPanelApi, PropsType extends {} = {}>(props: PresentationPanelProps<ApiType, PropsType>) => React.JSX.Element | null;
