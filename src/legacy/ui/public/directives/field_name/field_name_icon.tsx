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
import { palettes, EuiIcon } from '@elastic/eui';
import { IconSize } from '@elastic/eui/src/components/icon/icon';

function stringToNum(s: string) {
  return Array.from(s).reduce((acc, ch) => acc + ch.charCodeAt(0), 1);
}

// default => a unknown datatype, we could also use 'document'
const defaultIcon = 'questionInCircle';

const typeToIconMap: Record<string, string> = {
  boolean: 'invert',
  conflict: 'alert', // icon for an index pattern mapping conflict in discover
  date: 'calendar',
  geo_point: 'globe',
  geo_shape: 'globe',
  ip: 'storage',
  murmur3: 'document', // is a plugin's data type https://www.elastic.co/guide/en/elasticsearch/plugins/current/mapper-murmur3-usage.html
  number: 'number',
  source: 'editorCodeBlock',
  string: 'string',
};

export function getColorForDataType(type: string) {
  const { colors } = palettes.euiPaletteColorBlind;
  const colorIndex = stringToNum(type) % colors.length;
  return colors[colorIndex];
}

interface Props {
  type: string;
  label: string;
  size?: IconSize;
  useColor?: boolean;
}

export function FieldNameIcon({ type, label = '', size = 's', useColor = false }: Props) {
  const usedIconType = typeToIconMap[type] || defaultIcon;

  return (
    <EuiIcon
      type={usedIconType}
      aria-label={label ? label : type}
      size={size as IconSize}
      color={useColor ? getColorForDataType(usedIconType) : undefined}
    />
  );
}
