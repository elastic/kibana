import type { FC } from 'react';
import type { SavedObjectWithMetadata } from '../../../../common';
export interface InspectProps {
    object: SavedObjectWithMetadata<any>;
}
export declare const Inspect: FC<InspectProps>;
