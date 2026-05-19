import type { Type } from '@kbn/config-schema';
export declare const serviceDefinitionSchema: import("@kbn/config-schema").ObjectType<{
    get: Type<Readonly<{
        in?: any;
        out?: any;
    } & {}> | undefined>;
    bulkGet: Type<Readonly<{
        in?: any;
        out?: any;
    } & {}> | undefined>;
    create: Type<Readonly<{
        in?: any;
        out?: any;
    } & {}> | undefined>;
    update: Type<Readonly<{
        in?: any;
        out?: any;
    } & {}> | undefined>;
    delete: Type<Readonly<{
        in?: any;
        out?: any;
    } & {}> | undefined>;
    search: Type<Readonly<{
        in?: any;
        out?: any;
    } & {}> | undefined>;
    mSearch: Type<Readonly<{
        out?: Readonly<{
            result?: Readonly<{
                up?: any;
                down?: any;
                schema?: any;
            } & {}> | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
}>;
