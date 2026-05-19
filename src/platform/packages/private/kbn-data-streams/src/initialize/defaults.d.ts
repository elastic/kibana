import type { AnyDataStreamDefinition } from '../types';
/**
 * Do not change these defaults lightly... They are applied to all data streams and may
 * result in a large number of updated data streams when this code is released.
 */
export declare function applyDefaults(def: AnyDataStreamDefinition): AnyDataStreamDefinition;
