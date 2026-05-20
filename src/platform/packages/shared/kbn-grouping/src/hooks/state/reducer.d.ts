import type { Action, GroupMap } from '../types';
export declare const initialState: GroupMap;
export declare const groupsReducerWithStorage: (state: GroupMap, action: Action) => {
    groupById: {
        [x: string]: import("../types").GroupModel | {
            activeGroups: string[];
            options: import("../types").GroupOption[];
            settings?: import("../types").GroupSettings;
        };
    };
};
