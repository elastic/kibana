/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import classNames from 'classnames';
import type { EuiTokenProps } from '@elastic/eui';
import { EuiToken } from '@elastic/eui';

// defaultIcon => a unknown datatype
const defaultIcon = { iconType: 'question', color: 'gray' };

export const typeToEuiIconMap = {
  binary: { iconType: 'tokenBinary' },
  boolean: { iconType: 'tokenBoolean' },
  // icon for an index pattern mapping conflict in discover
  conflict: { iconType: 'warning', color: 'euiColorVis9', shape: 'square' },
  date: { iconType: 'tokenDate' },
  date_nanos: { iconType: 'tokenDate' },
  date_range: { iconType: 'tokenDate' },
  dense_vector: { iconType: 'tokenVectorDense' },
  geo_point: { iconType: 'tokenGeo' },
  geo_shape: { iconType: 'tokenGeo' },
  ip: { iconType: 'tokenIP' },
  ip_range: { iconType: 'tokenIP' },
  flattened: { iconType: 'tokenFlattened' },
  match_only_text: { iconType: 'tokenString' },
  // Numeric types
  number: { iconType: 'tokenNumber' },
  number_range: { iconType: 'tokenNumber' },
  byte: { iconType: 'tokenNumber' },
  double: { iconType: 'tokenNumber' },
  float: { iconType: 'tokenNumber' },
  half_float: { iconType: 'tokenNumber' },
  integer: { iconType: 'tokenNumber' },
  long: { iconType: 'tokenNumber' },
  scaled_float: { iconType: 'tokenNumber' },
  short: { iconType: 'tokenNumber' },
  unsigned_long: { iconType: 'tokenNumber' },
  // is a plugin's data type https://www.elastic.co/guide/en/elasticsearch/plugins/current/mapper-murmur3-usage.html
  murmur3: { iconType: 'tokenSearchType' },
  rank_feature: { iconType: 'tokenRankFeature' },
  rank_features: { iconType: 'tokenRankFeatures' },
  histogram: { iconType: 'tokenHistogram' },
  exponential_histogram: { iconType: 'tokenHistogram' },
  tdigest: { iconType: 'tokenHistogram' },
  _source: { iconType: 'editorCodeBlock', color: 'gray' },
  point: { iconType: 'tokenShape' }, // there is no separate icon for `point` yet
  shape: { iconType: 'tokenShape' },
  sparse_vector: { iconType: 'tokenVectorSparse' },
  semantic_text: { iconType: 'tokenSemanticText' },
  string: { iconType: 'tokenString' },
  text: { iconType: 'tokenString' },
  wildcard: { iconType: 'tokenString' },
  search_as_you_type: { iconType: 'tokenSearchType' },
  keyword: { iconType: 'tokenKeyword' },
  constant_keyword: { iconType: 'tokenConstant' },
  gauge: { iconType: 'tokenMetricGauge' },
  counter: { iconType: 'tokenMetricCounter' },
  nested: { iconType: 'tokenNested' },
  version: { iconType: 'tokenTag' },
  percolator: { iconType: 'tokenPercolator' },
  null: { iconType: 'tokenNull' },
} as const;

type AllowedIconType = keyof typeof typeToEuiIconMap;

export interface FieldIconProps extends Omit<EuiTokenProps, 'iconType'> {
  type: AllowedIconType | (string & {});
  label?: string;
  scripted?: boolean;
}

/**
 * Field token icon used across the app
 */
export function FieldIcon({
  type,
  label,
  size = 's',
  scripted,
  className,
  ...rest
}: FieldIconProps) {
  const token = typeToEuiIconMap[type as AllowedIconType] || defaultIcon;

  return (
    <EuiToken
      {...token}
      className={classNames('kbnFieldIcon', className)}
      aria-label={label || type}
      title={label || type}
      size={size as EuiTokenProps['size']}
      fill={scripted ? 'dark' : undefined}
      {...rest}
    />
  );
}
