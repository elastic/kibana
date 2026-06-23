import React from 'react';
import type { ESQLColumn } from '@kbn/es-types';
export declare function ChooseColumnPopover({ columns, updateQuery, }: {
    columns: ESQLColumn[];
    updateQuery: (column: string) => void;
}): React.JSX.Element;
