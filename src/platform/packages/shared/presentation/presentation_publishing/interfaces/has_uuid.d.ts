export interface HasUniqueId {
    uuid: string;
}
export declare const apiHasUniqueId: (unknownApi: null | unknown) => unknownApi is HasUniqueId;
