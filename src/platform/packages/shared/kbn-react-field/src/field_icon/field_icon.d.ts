import React from 'react';
import type { EuiTokenProps } from '@elastic/eui';
export declare const typeToEuiIconMap: {
    readonly binary: {
        readonly iconType: "tokenBinary";
    };
    readonly boolean: {
        readonly iconType: "tokenBoolean";
    };
    readonly conflict: {
        readonly iconType: "warning";
        readonly color: "euiColorVis9";
        readonly shape: "square";
    };
    readonly date: {
        readonly iconType: "tokenDate";
    };
    readonly date_nanos: {
        readonly iconType: "tokenDate";
    };
    readonly date_range: {
        readonly iconType: "tokenDate";
    };
    readonly dense_vector: {
        readonly iconType: "tokenVectorDense";
    };
    readonly geo_point: {
        readonly iconType: "tokenGeo";
    };
    readonly geo_shape: {
        readonly iconType: "tokenGeo";
    };
    readonly ip: {
        readonly iconType: "tokenIP";
    };
    readonly ip_range: {
        readonly iconType: "tokenIP";
    };
    readonly flattened: {
        readonly iconType: "tokenFlattened";
    };
    readonly match_only_text: {
        readonly iconType: "tokenString";
    };
    readonly number: {
        readonly iconType: "tokenNumber";
    };
    readonly number_range: {
        readonly iconType: "tokenNumber";
    };
    readonly byte: {
        readonly iconType: "tokenNumber";
    };
    readonly double: {
        readonly iconType: "tokenNumber";
    };
    readonly float: {
        readonly iconType: "tokenNumber";
    };
    readonly half_float: {
        readonly iconType: "tokenNumber";
    };
    readonly integer: {
        readonly iconType: "tokenNumber";
    };
    readonly long: {
        readonly iconType: "tokenNumber";
    };
    readonly scaled_float: {
        readonly iconType: "tokenNumber";
    };
    readonly short: {
        readonly iconType: "tokenNumber";
    };
    readonly unsigned_long: {
        readonly iconType: "tokenNumber";
    };
    readonly murmur3: {
        readonly iconType: "tokenSearchType";
    };
    readonly rank_feature: {
        readonly iconType: "tokenRankFeature";
    };
    readonly rank_features: {
        readonly iconType: "tokenRankFeatures";
    };
    readonly histogram: {
        readonly iconType: "tokenHistogram";
    };
    readonly exponential_histogram: {
        readonly iconType: "tokenHistogram";
    };
    readonly tdigest: {
        readonly iconType: "tokenHistogram";
    };
    readonly _source: {
        readonly iconType: "code";
        readonly color: "gray";
    };
    readonly point: {
        readonly iconType: "tokenShape";
    };
    readonly shape: {
        readonly iconType: "tokenShape";
    };
    readonly sparse_vector: {
        readonly iconType: "tokenVectorSparse";
    };
    readonly semantic_text: {
        readonly iconType: "tokenSemanticText";
    };
    readonly string: {
        readonly iconType: "tokenString";
    };
    readonly text: {
        readonly iconType: "tokenString";
    };
    readonly wildcard: {
        readonly iconType: "tokenString";
    };
    readonly search_as_you_type: {
        readonly iconType: "tokenSearchType";
    };
    readonly keyword: {
        readonly iconType: "tokenKeyword";
    };
    readonly constant_keyword: {
        readonly iconType: "tokenConstant";
    };
    readonly gauge: {
        readonly iconType: "tokenMetricGauge";
    };
    readonly counter: {
        readonly iconType: "tokenMetricCounter";
    };
    readonly nested: {
        readonly iconType: "tokenNested";
    };
    readonly version: {
        readonly iconType: "tokenTag";
    };
    readonly percolator: {
        readonly iconType: "tokenPercolator";
    };
    readonly null: {
        readonly iconType: "tokenNull";
    };
};
type AllowedIconType = keyof typeof typeToEuiIconMap;
export interface FieldIconProps extends Omit<EuiTokenProps, 'iconType'> {
    type: AllowedIconType | (string & {});
    label?: string;
    scripted?: boolean;
}
/**
 * Field token icon used across the app
 */
export declare function FieldIcon({ type, label, size, scripted, className, ...rest }: FieldIconProps): React.JSX.Element;
export {};
