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
// @ts-ignore
import React from 'react';
import { i18n } from '@kbn/i18n';

interface Props {
  name: string;
  displayName: string;
  scripted: boolean;
  results: any;
  type: string;
  field: any;
}

export function TypeIcon(props: { fieldType: string }) {
  switch (props.fieldType) {
    case 'string':
      return (
        <span
          aria-label={i18n.translate('common.ui.directives.fieldNameIcons.stringFieldAriaLabel', {
            defaultMessage: 'String field',
          })}
          className="dscField__icon"
        >
          <strong aria-hidden="true">t</strong>
        </span>
      );
    default:
      return <span>{props.fieldType}</span>;
  }
}

export function FieldName(props: Props) {
  /** $el
  .attr('title', name)
  .toggleClass('dscField--noResults', results)
  .toggleClass('scripted', scripted)
  .prepend(typeIcon(type))
  .append($('<span>')
    .text(displayName)
    .addClass('dscFieldName')
  );
  */
  const type = props.field ? props.field.type : props.type;
  const name = props.field ? props.field.name : props.displayName;

  return (
    <span>
      <TypeIcon fieldType={type} />
      <span className="dscFieldName">{name}</span>
    </span>
  );
}
