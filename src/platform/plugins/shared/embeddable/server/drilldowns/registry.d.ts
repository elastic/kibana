import type { Type } from '@kbn/config-schema';
import type { DrilldownSetup } from './types';
export declare function getDrilldownRegistry(): {
    registerDrilldown: (type: string, drilldown: DrilldownSetup) => void;
    transforms: {
        transformIn: <State extends import("./types").SerializedDrilldowns>(state: State) => {
            state: State;
            references: never[];
        } | {
            state: State & {
                drilldowns: import("./types").DrilldownState[];
            };
            references: import("@kbn/content-management-utils").Reference[];
        };
        transformOut: <StoredState extends import("./types").SerializedDrilldowns>(storedState: StoredState, references?: import("@kbn/content-management-utils").Reference[]) => StoredState;
    };
    getSchema: (supportedTriggers: string[]) => import("@kbn/config-schema").ObjectType<{
        drilldowns: Type<Readonly<{
            label: string;
            type: string;
            trigger: string;
        }>[] | undefined>;
    }>;
};
