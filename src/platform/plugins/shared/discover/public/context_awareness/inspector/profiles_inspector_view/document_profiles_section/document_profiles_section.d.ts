import React from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { Contexts } from '../../../hooks/use_active_contexts';
export declare function DocumentProfilesSection({ documentContexts, onViewRecordDetails, }: {
    documentContexts: Contexts['documentContexts'];
    onViewRecordDetails: (record: DataTableRecord) => void;
}): React.JSX.Element;
