import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { InternalStateThunkActionCreator, TabActionPayload } from '../internal_state';
export declare const addFilter: InternalStateThunkActionCreator<[
    TabActionPayload<{
        field: Parameters<DocViewFilterFn>[0];
        value: Parameters<DocViewFilterFn>[1];
        mode: Parameters<DocViewFilterFn>[2];
    }>
]>;
