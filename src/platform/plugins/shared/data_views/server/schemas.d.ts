import type { Type } from '@kbn/config-schema';
import type { RuntimeType } from '../common';
export declare const serializedFieldFormatSchema: import("@kbn/config-schema").ObjectType<{
    id: Type<string | undefined>;
    params: Type<any>;
}>;
export declare const runtimeFieldNonCompositeFieldsSpecTypeSchema: Type<"boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite">;
export declare const primitiveRuntimeFieldSchema: import("@kbn/config-schema").ObjectType<{
    script: Type<Readonly<{} & {
        source: string;
    }> | undefined>;
    format: Type<Readonly<{
        id?: string | undefined;
        params?: any;
    } & {}> | undefined>;
    customLabel: Type<string | undefined>;
    customDescription: Type<string | undefined>;
    popularity: Type<number | undefined>;
    type: Type<"boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite">;
}>;
export declare const compositeRuntimeFieldSchema: import("@kbn/config-schema").ObjectType<{
    script: Type<Readonly<{} & {
        source: string;
    }> | undefined>;
    fields: Type<Record<string, Readonly<{
        format?: Readonly<{
            id?: string | undefined;
            params?: any;
        } & {}> | undefined;
        customLabel?: string | undefined;
        customDescription?: string | undefined;
        popularity?: number | undefined;
    } & {
        type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
    }>> | undefined>;
    type: Type<RuntimeType>;
}>;
export declare const runtimeFieldSchema: Type<Readonly<{
    format?: Readonly<{
        id?: string | undefined;
        params?: any;
    } & {}> | undefined;
    script?: Readonly<{} & {
        source: string;
    }> | undefined;
    customLabel?: string | undefined;
    customDescription?: string | undefined;
    popularity?: number | undefined;
} & {
    type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
}> | Readonly<{
    fields?: Record<string, Readonly<{
        format?: Readonly<{
            id?: string | undefined;
            params?: any;
        } & {}> | undefined;
        customLabel?: string | undefined;
        customDescription?: string | undefined;
        popularity?: number | undefined;
    } & {
        type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
    }>> | undefined;
    script?: Readonly<{} & {
        source: string;
    }> | undefined;
} & {
    type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
}>>;
export declare const runtimeFieldSchemaUpdate: Type<Readonly<{
    type?: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite" | undefined;
    format?: Readonly<{
        id?: string | undefined;
        params?: any;
    } & {}> | undefined;
    script?: Readonly<{} & {
        source: string;
    }> | undefined;
    customLabel?: string | undefined;
    customDescription?: string | undefined;
    popularity?: number | undefined;
} & {}> | Readonly<{
    fields?: Record<string, Readonly<{
        format?: Readonly<{
            id?: string | undefined;
            params?: any;
        } & {}> | undefined;
        customLabel?: string | undefined;
        customDescription?: string | undefined;
        popularity?: number | undefined;
    } & {
        type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
    }>> | undefined;
    type?: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite" | undefined;
    script?: Readonly<{} & {
        source: string;
    }> | undefined;
} & {}>>;
export declare const fieldSpecSchemaFields: {
    name: Type<string>;
    type: Type<string>;
    count: Type<number | undefined>;
    script: Type<string | undefined>;
    format: Type<Readonly<{
        id?: string | undefined;
        params?: any;
    } & {}> | undefined>;
    esTypes: Type<string[] | undefined>;
    scripted: Type<boolean | undefined>;
    subType: Type<Readonly<{
        nested?: Readonly<{} & {
            path: string;
        }> | undefined;
        multi?: Readonly<{} & {
            parent: string;
        }> | undefined;
    } & {}> | undefined>;
    customLabel: Type<string | undefined>;
    customDescription: Type<string | undefined>;
    shortDotsEnable: Type<boolean | undefined>;
    searchable: Type<boolean | undefined>;
    aggregatable: Type<boolean | undefined>;
    readFromDocValues: Type<boolean | undefined>;
    runtimeField: Type<Readonly<{
        format?: Readonly<{
            id?: string | undefined;
            params?: any;
        } & {}> | undefined;
        script?: Readonly<{} & {
            source: string;
        }> | undefined;
        customLabel?: string | undefined;
        customDescription?: string | undefined;
        popularity?: number | undefined;
    } & {
        type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
    }> | Readonly<{
        fields?: Record<string, Readonly<{
            format?: Readonly<{
                id?: string | undefined;
                params?: any;
            } & {}> | undefined;
            customLabel?: string | undefined;
            customDescription?: string | undefined;
            popularity?: number | undefined;
        } & {
            type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
        }>> | undefined;
        script?: Readonly<{} & {
            source: string;
        }> | undefined;
    } & {
        type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
    }> | undefined>;
};
export declare const fieldSpecSchema: import("@kbn/config-schema").ObjectType<{
    name: Type<string>;
    type: Type<string>;
    count: Type<number | undefined>;
    script: Type<string | undefined>;
    format: Type<Readonly<{
        id?: string | undefined;
        params?: any;
    } & {}> | undefined>;
    esTypes: Type<string[] | undefined>;
    scripted: Type<boolean | undefined>;
    subType: Type<Readonly<{
        nested?: Readonly<{} & {
            path: string;
        }> | undefined;
        multi?: Readonly<{} & {
            parent: string;
        }> | undefined;
    } & {}> | undefined>;
    customLabel: Type<string | undefined>;
    customDescription: Type<string | undefined>;
    shortDotsEnable: Type<boolean | undefined>;
    searchable: Type<boolean | undefined>;
    aggregatable: Type<boolean | undefined>;
    readFromDocValues: Type<boolean | undefined>;
    runtimeField: Type<Readonly<{
        format?: Readonly<{
            id?: string | undefined;
            params?: any;
        } & {}> | undefined;
        script?: Readonly<{} & {
            source: string;
        }> | undefined;
        customLabel?: string | undefined;
        customDescription?: string | undefined;
        popularity?: number | undefined;
    } & {
        type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
    }> | Readonly<{
        fields?: Record<string, Readonly<{
            format?: Readonly<{
                id?: string | undefined;
                params?: any;
            } & {}> | undefined;
            customLabel?: string | undefined;
            customDescription?: string | undefined;
            popularity?: number | undefined;
        } & {
            type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
        }>> | undefined;
        script?: Readonly<{} & {
            source: string;
        }> | undefined;
    } & {
        type: "boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite";
    }> | undefined>;
}>;
