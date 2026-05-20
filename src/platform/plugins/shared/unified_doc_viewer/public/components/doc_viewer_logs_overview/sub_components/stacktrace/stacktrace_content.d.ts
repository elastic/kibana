import type { DataTableRecord } from '@kbn/discover-utils';
import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
export declare function StacktraceContent({ hit, dataView }: {
    hit: DataTableRecord;
    dataView: DataView;
}): React.JSX.Element;
