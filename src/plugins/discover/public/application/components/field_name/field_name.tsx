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
import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { FieldIcon, FieldIconProps } from '../../../../../kibana_react/public';
import { getFieldTypeName } from './field_type_name';
import { FieldMapping } from '../../doc_views/doc_views_types';

// properties fieldType and fieldName are provided in kbn_doc_view
// this should be changed when both components are deangularized
interface Props {
  fieldName: string;
  fieldType: string;
  fieldMapping?: FieldMapping;
  fieldIconProps?: Omit<FieldIconProps, 'type'>;
  scripted?: boolean;
}

export function FieldName({
  fieldName,
  fieldMapping,
  fieldType,
  fieldIconProps,
  scripted = false,
}: Props) {
  const typeName = getFieldTypeName(fieldType);
  const displayName =
    fieldMapping && fieldMapping.displayName ? fieldMapping.displayName : fieldName;
  const tooltip = displayName !== fieldName ? `${fieldName} (${displayName})` : fieldName;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <FieldIcon type={fieldType} label={typeName} scripted={scripted} {...fieldIconProps} />
      </EuiFlexItem>
      <EuiFlexItem className="eui-textTruncate">
        <EuiToolTip
          position="top"
          content={tooltip}
          delay="long"
          anchorClassName="eui-textTruncate"
        >
          <span>{displayName}</span>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
