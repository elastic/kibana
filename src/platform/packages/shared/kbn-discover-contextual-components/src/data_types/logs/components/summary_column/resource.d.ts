import React from 'react';
import type { CommonProps } from '@elastic/eui';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { ResourceFieldDescriptor } from './utils';
interface ResourceProps {
    fields: ResourceFieldDescriptor[];
    limited?: boolean;
    onFilter?: DocViewFilterFn;
    css?: CommonProps['css'];
}
export declare const Resource: ({ fields, limited, onFilter, ...props }: ResourceProps) => React.JSX.Element;
export {};
