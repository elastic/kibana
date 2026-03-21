import type { Reference } from '@kbn/content-management-utils';
import type { SerializedDrilldowns, DrilldownState } from '../../server';
export declare function getTransformDrilldownsIn(getTranformIn: (type: string) => ((state: DrilldownState) => {
    state: DrilldownState;
    references?: Reference[];
}) | undefined): <State extends SerializedDrilldowns>(state: State) => {
    state: State;
    references: never[];
} | {
    state: State & {
        drilldowns: DrilldownState[];
    };
    references: Reference[];
};
