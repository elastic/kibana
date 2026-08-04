import type { IconType } from '@elastic/eui';
import React from 'react';
export declare const NoCreatorTip: (props: {
    iconType?: IconType;
    includeVersionTip?: boolean;
    entityNamePlural?: string;
}) => React.JSX.Element;
export declare const NoUpdaterTip: (props: {
    iconType?: string;
    includeVersionTip?: boolean;
    entityNamePlural?: string;
}) => React.JSX.Element;
