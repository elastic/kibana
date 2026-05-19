export declare function getSchemaByKbnType(kbnType: string | undefined): "numeric" | "string" | "boolean" | "datetime" | "kibana-json";
export declare function getSchemaDetectors(): {
    type: string;
    detector(): number;
    sortTextAsc: string;
    sortTextDesc: string;
    icon: string;
    color: string;
}[];
