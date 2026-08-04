import type { RowControlComponent, RowControlRowProps } from '@kbn/discover-utils';
import type { RefObject } from 'react';
import React from 'react';
import { type EuiDataGridRefProps } from '@elastic/eui';
import type { IndexUpdateService } from '../../services/index_update_service';
export declare const getAddRowControl: (indexUpdateService: IndexUpdateService, dataTableRef: RefObject<EuiDataGridRefProps>) => {
    id: string;
    width: number;
    render: (Control: RowControlComponent, props: RowControlRowProps) => React.JSX.Element;
};
