import type { Reference } from '@kbn/content-management-utils/src/types';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { StoredVisualizeByValueState, StoredVisualizeEmbeddableState } from './types';
export declare function getTransformOut(transformDrilldownsOut: DrilldownTransforms['transformOut']): (storedState: StoredVisualizeEmbeddableState, references?: Reference[]) => import("./types").StoredVisualizeByReferenceState | StoredVisualizeByValueState | {
    savedObjectId: string;
    description?: string | undefined;
    title?: string | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    drilldowns?: import("../../../../embeddable/server").DrilldownState[];
    uiState?: any;
} | {
    savedObjectId: string;
    description?: string | undefined;
    title?: string | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    drilldowns?: import("../../../../embeddable/server").DrilldownState[];
    savedVis: import("./types").StoredVis;
} | {
    savedVis: import("../..").SerializedVis<import("@kbn/visualizations-common").VisParams>;
    description?: string | undefined;
    title?: string | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    drilldowns?: import("../../../../embeddable/server").DrilldownState[];
    uiState?: any;
};
