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
import React, { OptionHTMLAttributes, ReactNode } from 'react';
import { EuiTitle, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface Props {
  /**
   * triggered on user change of the selection
   */
  onChange: (id: string, value: string) => void;
  /**
   * triggered when the "additional filter btn" is clicked
   */
  id: string;
  /**
  /* Current value of the select field
  */
  value: string;
  /**
   * array of options for selection
   */
  options: Array<{ text: ReactNode } & OptionHTMLAttributes<HTMLOptionElement>>;
  /**
   * label for the selector
   */
  label: string;
}

export function FieldSelector({ id, options, label, value, onChange }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(id, e.target.value);
  };

  return (
    <React.Fragment>
      <EuiTitle size="xxs">
        <h4>{label}</h4>
      </EuiTitle>
      <EuiSelect
        id={`${id}-select`}
        options={options}
        value={value}
        onChange={handleChange}
        aria-label={i18n.translate('kbn.discover.fieldChooser.filter.fieldSelectorLabel', {
          defaultMessage: 'Selection of {id} filter options',
          values: { id },
        })}
      />
    </React.Fragment>
  );
}
