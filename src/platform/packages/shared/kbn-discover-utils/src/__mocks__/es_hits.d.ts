import type { DataView } from '@kbn/data-views-plugin/common';
import type { EsHitRecord } from '../types';
export declare const esHitsMock: ({
    _index: string;
    _id: string;
    _score: number;
    _type: string;
    _source: {
        date: string;
        message: string;
        bytes: number;
        name?: undefined;
        extension?: undefined;
    };
} | {
    _index: string;
    _id: string;
    _score: number;
    _type: string;
    _source: {
        date: string;
        name: string;
        extension: string;
        message?: undefined;
        bytes?: undefined;
    };
} | {
    _index: string;
    _id: string;
    _score: number;
    _type: string;
    _source: {
        date: string;
        name: string;
        extension: string;
        bytes: number;
        message?: undefined;
    };
} | {
    _index: string;
    _id: string;
    _score: number;
    _type: string;
    _source: {
        date: string;
        name: string;
        extension: string;
        bytes: number;
        message: string;
    };
})[];
export declare const esHitsMockWithSort: ({
    sort: string[];
    _index: string;
    _id: string;
    _score: number;
    _type: string;
    _source: {
        date: string;
        message: string;
        bytes: number;
        name?: undefined;
        extension?: undefined;
    };
} | {
    sort: string[];
    _index: string;
    _id: string;
    _score: number;
    _type: string;
    _source: {
        date: string;
        name: string;
        extension: string;
        message?: undefined;
        bytes?: undefined;
    };
} | {
    sort: string[];
    _index: string;
    _id: string;
    _score: number;
    _type: string;
    _source: {
        date: string;
        name: string;
        extension: string;
        bytes: number;
        message?: undefined;
    };
} | {
    sort: string[];
    _index: string;
    _id: string;
    _score: number;
    _type: string;
    _source: {
        date: string;
        name: string;
        extension: string;
        bytes: number;
        message: string;
    };
})[];
export declare const generateEsHit: (params?: Partial<EsHitRecord>) => EsHitRecord;
export declare const generateEsHits: (dataView: DataView, count: number) => EsHitRecord[];
