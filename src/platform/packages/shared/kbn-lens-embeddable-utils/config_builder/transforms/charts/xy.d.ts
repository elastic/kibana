import type { TypedLensSerializedState, XYPersistedState } from '@kbn/lens-common';
import type { XYConfig } from '../../schema';
import type { LensAttributes } from '../../types';
type XYLens = Extract<TypedLensSerializedState['attributes'], {
    visualizationType: 'lnsXY';
}>;
type XYLensState = Omit<XYLens['state'], 'filters' | 'query'>;
type XYLensWithoutQueryAndFilters = Omit<XYLens, 'state'> & {
    state: Omit<XYLensState, 'visualization'> & {
        visualization: XYPersistedState;
    };
};
export declare function fromAPItoLensState(config: XYConfig): XYLensWithoutQueryAndFilters;
export declare function fromLensStateToAPI(config: LensAttributes): XYConfig;
export {};
