import type { DataTableRecord } from '@kbn/discover-utils';
import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
export declare const APM_ERROR_DATASTREAM_FIELDS: {
    dataStreamType: string;
    dataStreamDataset: string;
};
export declare function ApmStacktrace({ hit, dataView }: {
    hit: DataTableRecord;
    dataView: DataView;
}): React.JSX.Element | null;
