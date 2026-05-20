export interface FieldInfo {
    value: unknown;
    field: string;
}
export interface BuildSectionDescriptionParams {
    serviceName?: FieldInfo;
    culprit?: FieldInfo;
    message?: FieldInfo;
    type?: FieldInfo;
    groupingName?: FieldInfo;
}
export declare function buildSectionDescription({ serviceName, culprit, message, type, groupingName, }: BuildSectionDescriptionParams): string | undefined;
