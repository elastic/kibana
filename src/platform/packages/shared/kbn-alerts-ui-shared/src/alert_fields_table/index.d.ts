import React from 'react';
import type { EuiTabbedContentProps } from '@elastic/eui';
import type { Alert } from '@kbn/alerting-types';
export declare const search: {
    box: {
        incremental: boolean;
        placeholder: string;
        schema: boolean;
    };
};
export declare const ScrollableFlyoutTabbedContent: (props: EuiTabbedContentProps) => React.JSX.Element;
export interface AlertFieldsTableProps {
    /**
     * The raw alert object
     */
    alert: Alert;
    /**
     * A list of alert field keys to be shown in the table.
     * When not defined, all the fields are shown.
     */
    fields?: Array<keyof Alert>;
}
/**
 * A paginated, filterable table to show alert object fields
 */
export declare const AlertFieldsTable: React.MemoExoticComponent<({ alert, fields }: AlertFieldsTableProps) => React.JSX.Element>;
