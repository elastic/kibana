import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
export interface ContextAppProps {
    dataView: DataView;
    anchorId: string;
    referrer?: string;
}
export declare const ContextApp: ({ dataView, anchorId, referrer }: ContextAppProps) => React.JSX.Element;
