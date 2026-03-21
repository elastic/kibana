import type { getTransformDrilldownsIn } from './transform_drilldowns_in';
import type { getTransformDrilldownsOut } from './transform_drilldowns_out';
export type DrilldownTransforms = {
    transformIn: ReturnType<typeof getTransformDrilldownsIn>;
    transformOut: ReturnType<typeof getTransformDrilldownsOut>;
};
