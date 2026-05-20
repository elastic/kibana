import type { GroupOption, UpdateActiveGroups, UpdateGroupOptions, GroupSettings, UpdateGroupSettings } from '../types';
export declare const groupActions: {
    updateActiveGroups: ({ activeGroups, id, }: {
        activeGroups: string[];
        id: string;
    }) => UpdateActiveGroups;
    updateGroupOptions: ({ newOptionList, id, }: {
        newOptionList: GroupOption[];
        id: string;
    }) => UpdateGroupOptions;
    updateGroupSettings: ({ settings, id, }: {
        settings?: GroupSettings;
        id: string;
    }) => UpdateGroupSettings;
};
