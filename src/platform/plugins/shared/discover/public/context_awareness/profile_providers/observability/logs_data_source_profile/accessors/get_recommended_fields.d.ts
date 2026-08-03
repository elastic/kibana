import type { DataSourceProfileProvider } from '../../../..';
export declare const createRecommendedFields: ({ defaultFields, }: {
    defaultFields?: ReadonlyArray<string>;
}) => DataSourceProfileProvider["profile"]["getRecommendedFields"];
