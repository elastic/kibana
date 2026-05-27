import type { ReactNode } from 'react';
import React from 'react';
interface RequestCodeViewerProps {
    value: string;
    actions?: Array<{
        name: string;
        action: ReactNode;
    }>;
}
/**
 * @internal
 */
export declare const RequestCodeViewer: ({ value, actions }: RequestCodeViewerProps) => React.JSX.Element;
export {};
