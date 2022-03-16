/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import classNames from 'classnames';
import { EuiToken, EuiTokenProps } from '@elastic/eui';

export interface FieldIconProps extends Omit<EuiTokenProps, 'iconType'> {
  type:
    | 'boolean'
    | 'conflict'
    | 'date'
    | 'date_range'
    | 'geo_point'
    | 'geo_shape'
    | 'ip'
    | 'ip_range'
    | 'murmur3'
    | 'number'
    | 'number_range'
    | '_source'
    | 'string'
    | string
    | 'nested'
    | 'version';
  label?: string;
  scripted?: boolean;
}

// defaultIcon => a unknown datatype
const defaultIcon = { iconType: 'questionInCircle', color: 'gray' };

export const typeToEuiIconMap: Partial<Record<string, EuiTokenProps>> = {
  boolean: { iconType: 'tokenBoolean' },
  // icon for an index pattern mapping conflict in discover
  conflict: { iconType: 'alert', color: 'euiColorVis9', shape: 'square' },
  date: { iconType: 'tokenDate' },
  date_range: { iconType: 'tokenDate' },
  geo_point: { iconType: 'tokenGeo' },
  geo_shape: { iconType: 'tokenGeo' },
  ip: { iconType: 'tokenIP' },
  ip_range: { iconType: 'tokenIP' },
  // is a plugin's data type https://www.elastic.co/guide/en/elasticsearch/plugins/current/mapper-murmur3-usage.html
  murmur3: { iconType: 'tokenFile' },
  number: { iconType: 'tokenNumber' },
  number_range: { iconType: 'tokenNumber' },
  histogram: { iconType: 'tokenHistogram' },
  _source: { iconType: 'editorCodeBlock', color: 'gray' },
  string: { iconType: 'tokenString' },
  text: { iconType: 'tokenString' },
  keyword: { iconType: 'tokenKeyword' },
  nested: { iconType: 'tokenNested' },
  version: { iconType: 'tokenTag' },
};

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
  const token = typeToEuiIconMap[type] || defaultIcon;

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
