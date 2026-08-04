import React from 'react';
import type { DataTableRecordWithContext } from '../../../profiles_manager';
export declare const DocumentProfileTable: ({ profileId, records, onViewRecordDetails, }: {
    profileId: string;
    records: DataTableRecordWithContext[];
    onViewRecordDetails: (record: DataTableRecordWithContext) => void;
}) => React.JSX.Element;
