import React from 'react';
import type { ErrorLike } from '@kbn/expressions-plugin/common';
import type { DefaultPresentationPanelApi } from './types';
export interface PresentationPanelErrorProps {
    error: ErrorLike;
    api?: DefaultPresentationPanelApi;
}
export declare const PresentationPanelErrorInternal: ({ api, error }: PresentationPanelErrorProps) => React.JSX.Element;
