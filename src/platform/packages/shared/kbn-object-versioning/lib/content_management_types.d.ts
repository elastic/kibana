import type { ObjectTransforms, Version, VersionableObject } from './types';
export interface ServicesDefinition {
    get?: {
        in?: {
            options?: VersionableObject<any, any, any, any>;
        };
        out?: {
            result?: VersionableObject<any, any, any, any>;
        };
    };
    bulkGet?: {
        in?: {
            options?: VersionableObject<any, any, any, any>;
        };
        out?: {
            result?: VersionableObject<any, any, any, any>;
        };
    };
    create?: {
        in?: {
            data?: VersionableObject<any, any, any, any>;
            options?: VersionableObject<any, any, any, any>;
        };
        out?: {
            result?: VersionableObject<any, any, any, any>;
        };
    };
    update?: {
        in?: {
            data?: VersionableObject<any, any, any, any>;
            options?: VersionableObject<any, any, any, any>;
        };
        out?: {
            result?: VersionableObject<any, any, any, any>;
        };
    };
    delete?: {
        in?: {
            options?: VersionableObject<any, any, any, any>;
        };
        out?: {
            result?: VersionableObject<any, any, any, any>;
        };
    };
    search?: {
        in?: {
            options?: VersionableObject<any, any, any, any>;
        };
        out?: {
            result?: VersionableObject<any, any, any, any>;
        };
    };
    mSearch?: {
        out?: {
            result?: VersionableObject<any, any, any, any>;
        };
    };
}
export interface ServiceTransforms {
    get: {
        in: {
            options: ObjectTransforms<any, any, any, any>;
        };
        out: {
            result: ObjectTransforms<any, any, any, any>;
        };
    };
    bulkGet: {
        in: {
            options: ObjectTransforms<any, any, any, any>;
        };
        out: {
            result: ObjectTransforms<any, any, any, any>;
        };
    };
    create: {
        in: {
            data: ObjectTransforms<any, any, any, any>;
            options: ObjectTransforms<any, any, any, any>;
        };
        out: {
            result: ObjectTransforms<any, any, any, any>;
        };
    };
    update: {
        in: {
            data: ObjectTransforms<any, any, any, any>;
            options: ObjectTransforms<any, any, any, any>;
        };
        out: {
            result: ObjectTransforms<any, any, any, any>;
        };
    };
    delete: {
        in: {
            options: ObjectTransforms<any, any, any, any>;
        };
        out: {
            result: ObjectTransforms<any, any, any, any>;
        };
    };
    search: {
        in: {
            options: ObjectTransforms<any, any, any, any>;
        };
        out: {
            result: ObjectTransforms<any, any, any, any>;
        };
    };
    mSearch: {
        out: {
            result: ObjectTransforms<any, any, any, any>;
        };
    };
}
export interface ServiceDefinitionVersioned {
    [version: Version]: ServicesDefinition;
}
