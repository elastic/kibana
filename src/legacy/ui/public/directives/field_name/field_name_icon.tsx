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

interface IconMapEntry {
  icon: string;
  color: string;
}
interface Props {
  type: string;
  label: string;
  size?: IconSize;
  useColor?: boolean;
}
const { colors } = palettes.euiPaletteColorBlind;
// default => a unknown datatype
const defaultIcon = { icon: 'questionInCircle', color: colors[0] };

const typeToEuiIconMap: Record<string, IconMapEntry> = {
  boolean: { icon: 'invert', color: colors[5] },
  // icon for an index pattern mapping conflict in discover
  conflict: { icon: 'alert', color: colors[8] },
  date: { icon: 'calendar', color: colors[7] },
  geo_point: { icon: 'globe', color: colors[2] },
  geo_shape: { icon: 'globe', color: colors[2] },
  ip: { icon: 'storage', color: colors[8] },
  // is a plugin's data type https://www.elastic.co/guide/en/elasticsearch/plugins/current/mapper-murmur3-usage.html
  murmur3: { icon: 'document', color: colors[1] },
  number: { icon: 'number', color: colors[0] },
  _source: { icon: 'editorCodeBlock', color: colors[3] },
  string: { icon: 'string', color: colors[4] },
};

export function FieldNameIcon({ type, label, size = 's', useColor = false }: Props) {
  const euiIcon = typeToEuiIconMap[type] || defaultIcon;

  return (
    <EuiIcon
      type={euiIcon.icon}
      aria-label={label || type}
      size={size as IconSize}
      color={useColor || type === 'conflict' ? euiIcon.color : undefined}
    />
  );
}
