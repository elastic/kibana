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

import { EuiComboBox, EuiComboBoxOptionProps, EuiFormRow, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import _ from 'lodash';
import React, { useState } from 'react';
import { documentationLinks } from '../../../../documentation_links/documentation_links';

interface VisEditorAggSelectProps {
  agg: any;
  label: string;
  aggTypeOptions: any;
  onChangeAggType: (agg: any, aggType: any) => void;
}

function VisEditorAggSelect({
  agg,
  label,
  aggTypeOptions,
  onChangeAggType,
}: VisEditorAggSelectProps) {
  const [isInvalid, setIsInvalid] = useState(false);
  const selectedOptions = agg.type ? [{ label: agg.type.title, value: agg.type }] : [];
  let aggHelpLink = null;

  if (_.has(agg, 'type.name')) {
    aggHelpLink = _.get(documentationLinks, ['aggs', agg.type.name]);
  }

  const labelNode = (
    <div>
      {label}
      {aggHelpLink && (
        <EuiLink
          href={aggHelpLink}
          target="_blank"
          rel="noopener"
          className="pull-right"
          type="button"
        >
          <FormattedMessage
            id="common.ui.vis.editors.aggSelect.helpLinkLabel"
            defaultMessage="{aggTitle} help"
            values={{ aggTitle: agg.type.title }}
          />
        </EuiLink>
      )}
    </div>
  );

  const onChange = (options: EuiComboBoxOptionProps[]) => {
    onChangeAggType(agg, _.get(options, '0.value'));
    setIsInvalid(options.length ? false : true);
  };

  const getGroupedOptions = () => {
    const groupedOptions =
      aggTypeOptions && aggTypeOptions.length
        ? aggTypeOptions.reduce((array: any[], type: any) => {
            const group = array.find(element => element.label === type.subtype);
            const option = {
              label: type.title,
              value: type,
            };

            if (group) {
              group.options.push(option);
            } else {
              array.push({ label: type.subtype, options: [option] });
            }

            return array;
          }, [])
        : [];

    groupedOptions.sort(sortByLabel);

    groupedOptions.forEach((group: any) => {
      group.options.sort(sortByLabel);
    });

    return groupedOptions;
  };

  return (
    <EuiFormRow label={labelNode} className="form-group">
      <EuiComboBox
        placeholder={i18n.translate('common.ui.vis.editors.aggSelect.selectAggPlaceholder', {
          defaultMessage: 'Select an aggregation',
        })}
        id="agg"
        options={getGroupedOptions()}
        selectedOptions={selectedOptions}
        singleSelection={{ asPlainText: true }}
        onChange={onChange}
        data-test-subj="visEditorAggSelect"
        isClearable={false}
        isInvalid={isInvalid}
      />
    </EuiFormRow>
  );
}

function sortByLabel(a: { label: string }, b: { label: string }) {
  return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
}

export { VisEditorAggSelect };
