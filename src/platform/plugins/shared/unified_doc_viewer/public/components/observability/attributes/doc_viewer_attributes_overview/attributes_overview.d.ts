import React from 'react';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
export interface AttributeField {
    name: string;
    displayName: string;
}
export declare function AttributesOverview({ columns, columnsMeta, hit, dataView, textBasedHits, filter, decreaseAvailableHeightBy, onAddColumn, onRemoveColumn, }: DocViewRenderProps): React.JSX.Element;
