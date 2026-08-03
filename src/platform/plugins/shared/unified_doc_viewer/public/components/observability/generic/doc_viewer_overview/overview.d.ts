import type { ObservabilityIndexes } from '@kbn/discover-utils/src';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React from 'react';
import type { DocViewActions } from '@kbn/unified-doc-viewer/src/services/types';
export type OverviewProps = DocViewRenderProps & {
    indexes: ObservabilityIndexes;
    profileId: string;
    showWaterfall?: boolean;
    showActions?: boolean;
    docViewActions?: DocViewActions;
};
export declare function Overview({ hit, filter, onAddColumn, onRemoveColumn, indexes, profileId, showWaterfall, dataView, decreaseAvailableHeightBy, docViewActions, }: OverviewProps): React.JSX.Element;
