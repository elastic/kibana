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
// @ts-ignore
import { shortenDottedString } from '../../../../core_plugins/kibana/common/utils/shorten_dotted_string';
import { FieldIcon } from '../../../../../../src/plugins/kibana_react/public';
import { getFieldTypeName } from './field_type_name';

// property field is provided at discover's field chooser
// properties fieldType and fieldName are provided in kbn_doc_view
// this should be changed when both components are deangularized
interface Props {
  field?: {
    type: string;
    name: string;
    rowCount?: number;
    scripted?: boolean;
  };
  fieldName?: string;
  fieldType?: string;
  useShortDots?: boolean;
}

export function FieldName({ field, fieldName, fieldType, useShortDots }: Props) {
  const type = field ? String(field.type) : String(fieldType);
  const typeName = getFieldTypeName(type);

  const name = field ? String(field.name) : String(fieldName);
  const displayName = useShortDots ? shortenDottedString(name) : name;

  const className = classNames({
    'dscField--noResults': field ? !field.rowCount && !field.scripted : false,
    // this is currently not styled, should display an icon
    scripted: field ? field.scripted : false,
  });

  return (
    <span className={className} title={typeName}>
      <FieldIcon type={type} label={typeName} />
      <span className="dscFieldName">{displayName}</span>
    </span>
  );
}
