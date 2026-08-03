import type { ObjectType, Type } from '@kbn/config-schema';
import type { Reference } from '@kbn/content-management-utils';
export type DrilldownState = {
    label: string;
    trigger: string;
    type: string;
};
export type SerializedDrilldowns = {
    drilldowns?: DrilldownState[];
};
export type DrilldownSetup<StoredState extends DrilldownState = DrilldownState, State extends DrilldownState = DrilldownState> = {
    /**
     * Schema defining distinct state for the drilldown type
     */
    schema: ObjectType;
    /**
     * List of triggers supported by this drilldown type
     * Used to
     * 1) narrow registry schemas by intersection of (embeddable) supported triggers
     * 2) populate triggers schema
     */
    supportedTriggers: string[];
    /**
     * Called on REST read routes to inject references and convert Stored State into API State
     */
    transformOut?: (storedState: StoredState, references?: Reference[]) => State;
    /**
     * Called on REST write routes to convert API State into Stored State and extracts references
     */
    transformIn?: (state: State) => {
        state: StoredState;
        references?: Reference[];
    };
};
export type GetDrilldownsSchemaFnType = (embeddableSupportedTriggers: string[]) => ObjectType<{
    drilldowns: Type<DrilldownState[] | undefined>;
}>;
