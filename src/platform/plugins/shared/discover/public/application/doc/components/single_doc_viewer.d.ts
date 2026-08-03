import React from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-views-plugin/public';
interface SingleDocViewerProps {
    record: DataTableRecord;
    dataView: DataView;
}
export declare const SingleDocViewer: React.FC<SingleDocViewerProps>;
export {};
