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
import chrome from 'ui/chrome';
// @ts-ignore
import { shortenDottedString } from '../../../../core_plugins/kibana/common/utils/shorten_dotted_string';
import { FieldNameIcon } from './field_name_icon';

const config = chrome.getUiSettingsClient();

interface Props {
  field: any;
  fieldName: string;
  fieldType: string;
}

export function FieldName(props: Props) {
  // field is provided at discover's field chooser
  // fieldType and fieldName in kbn_doc_view
  // this should be changed when both components are deangularized
  const type = props.field ? props.field.type : props.fieldType;
  const name = props.field ? props.field.name : props.fieldName;

  const className = classNames({
    'dscField--noResults': props.field ? !props.field.rowCount && !props.field.scripted : false,
    // this is currently not styled
    scripted: props.field ? props.field.scripted : false,
  });
  const isShortDots = config.get('shortDots:enable');
  const displayName = isShortDots ? shortenDottedString(name) : name;

  return (
    <span className={className} title={name}>
      <FieldNameIcon type={type} />
      <span className="dscFieldName">{displayName}</span>
    </span>
  );
}
