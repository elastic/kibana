/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import classNames from 'classnames';
import { EuiToken, EuiTokenProps } from '@elastic/eui';

export interface FieldIconProps extends Omit<EuiTokenProps, 'iconType'> {
  type:
    | 'boolean'
    | 'conflict'
    | 'date'
    | 'geo_point'
    | 'geo_shape'
    | 'ip'
    | 'murmur3'
    | 'number'
    | '_source'
    | 'string'
    | string
    | 'nested';
  label?: string;
  scripted?: boolean;
}

// defaultIcon => a unknown datatype
const defaultIcon = { iconType: 'questionInCircle', color: 'gray' };

export const typeToEuiIconMap: Partial<Record<string, EuiTokenProps>> = {
  boolean: { iconType: 'tokenBoolean' },
  // icon for an index pattern mapping conflict in discover
  conflict: { iconType: 'alert', color: 'euiVisColor9' },
  date: { iconType: 'tokenDate' },
  geo_point: { iconType: 'tokenGeo' },
  geo_shape: { iconType: 'tokenGeo' },
  ip: { iconType: 'tokenIP' },
  // is a plugin's data type https://www.elastic.co/guide/en/elasticsearch/plugins/current/mapper-murmur3-usage.html
  murmur3: { iconType: 'tokenFile' },
  number: { iconType: 'tokenNumber' },
  _source: { iconType: 'editorCodeBlock', color: 'gray' },
  string: { iconType: 'tokenString' },
  nested: { iconType: 'tokenNested' },
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
