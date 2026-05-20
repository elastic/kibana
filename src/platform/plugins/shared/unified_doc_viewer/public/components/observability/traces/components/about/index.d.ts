import React from 'react';
import { type DataTableRecord } from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
export interface AboutProps extends Pick<DocViewRenderProps, 'filter' | 'onAddColumn' | 'onRemoveColumn' | 'columns'> {
    hit: DataTableRecord;
    dataView: DocViewRenderProps['dataView'];
}
export declare const About: ({ hit, dataView, filter, onAddColumn, onRemoveColumn, columns, }: AboutProps) => React.JSX.Element;
