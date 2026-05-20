export declare function getSchemaByKbnType(kbnType: string | undefined): "string" | "boolean" | "numeric" | "kibana-json" | "datetime";
export declare function getSchemaDetectors(): {
    type: string;
    detector(): number;
    sortTextAsc: string;
    sortTextDesc: string;
    icon: string;
    color: string;
}[];
