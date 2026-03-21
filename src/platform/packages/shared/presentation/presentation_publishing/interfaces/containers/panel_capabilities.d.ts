export interface IsDuplicable {
    isDuplicable: boolean;
}
export declare const apiCanBeDuplicated: (unknownApi: unknown | null) => unknownApi is IsDuplicable;
export interface IsExpandable {
    isExpandable: boolean;
}
export declare const apiCanBeExpanded: (unknownApi: unknown | null) => unknownApi is IsExpandable;
export interface IsCustomizable {
    isCustomizable: boolean;
}
export declare const apiCanBeCustomized: (unknownApi: unknown | null) => unknownApi is IsCustomizable;
export interface IsPinnable {
    isPinnable: boolean;
}
export declare const apiCanBePinned: (unknownApi: unknown | null) => unknownApi is IsPinnable;
export type HasPanelCapabilities = IsExpandable & IsCustomizable & IsDuplicable & IsPinnable;
