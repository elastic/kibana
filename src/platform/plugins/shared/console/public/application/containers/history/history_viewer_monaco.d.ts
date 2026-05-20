import React from 'react';
import type { DevToolsSettings } from '../../../services';
export declare const HistoryViewer: ({ settings, req, }: {
    settings: DevToolsSettings;
    req: {
        method: string;
        endpoint: string;
        data: string;
        time: string;
    } | null;
}) => React.JSX.Element;
