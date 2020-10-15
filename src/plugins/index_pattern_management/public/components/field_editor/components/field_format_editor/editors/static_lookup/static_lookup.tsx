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

import React, { Fragment } from 'react';

import { EuiBasicTable, EuiButton, EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { DefaultFormatEditor } from '../default';

export interface StaticLookupFormatEditorFormatParams {
  lookupEntries: Array<{ key: string; value: string }>;
  unknownKeyValue: string;
}

interface StaticLookupItem {
  key: string;
  value: string;
  index: number;
}

export class StaticLookupFormatEditor extends DefaultFormatEditor<
  StaticLookupFormatEditorFormatParams
> {
  static formatId = 'static_lookup';
  onLookupChange = (newLookupParams: { value?: string; key?: string }, index: number) => {
    const lookupEntries = [...this.props.formatParams.lookupEntries];
    lookupEntries[index] = {
      ...lookupEntries[index],
      ...newLookupParams,
    };
    this.onChange({
      lookupEntries,
    });
  };

  addLookup = () => {
    const lookupEntries = [...this.props.formatParams.lookupEntries];
    this.onChange({
      lookupEntries: [...lookupEntries, {}],
    });
  };

  removeLookup = (index: number) => {
    const lookupEntries = [...this.props.formatParams.lookupEntries];
    lookupEntries.splice(index, 1);
    this.onChange({
      lookupEntries,
    });
  };

  render() {
    const { formatParams } = this.props;

    const items =
      (formatParams.lookupEntries &&
        formatParams.lookupEntries.length &&
        formatParams.lookupEntries.map((lookup, index) => {
          return {
            ...lookup,
            index,
          };
        })) ||
      [];

    const columns = [
      {
        field: 'key',
        name: (
          <FormattedMessage
            id="indexPatternManagement.staticLookup.keyLabel"
            defaultMessage="Key"
          />
        ),
        render: (value: number, item: StaticLookupItem) => {
          return (
            <EuiFieldText
              value={value || ''}
              onChange={(e) => {
                this.onLookupChange(
                  {
                    key: e.target.value,
                  },
                  item.index
                );
              }}
            />
          );
        },
      },
      {
        field: 'value',
        name: (
          <FormattedMessage
            id="indexPatternManagement.staticLookup.valueLabel"
            defaultMessage="Value"
          />
        ),
        render: (value: number, item: StaticLookupItem) => {
          return (
            <EuiFieldText
              value={value || ''}
              onChange={(e) => {
                this.onLookupChange(
                  {
                    value: e.target.value,
                  },
                  item.index
                );
              }}
            />
          );
        },
      },
      {
        field: 'actions',
        name: i18n.translate('indexPatternManagement.staticLookup.actions', {
          defaultMessage: 'actions',
        }),
        actions: [
          {
            name: i18n.translate('indexPatternManagement.staticLookup.deleteAria', {
              defaultMessage: 'Delete',
            }),
            description: i18n.translate('indexPatternManagement.staticLookup.deleteTitle', {
              defaultMessage: 'Delete entry',
            }),
            onClick: (item: StaticLookupItem) => {
              this.removeLookup(item.index);
            },
            type: 'icon',
            icon: 'trash',
            color: 'danger',
            available: () => items.length > 1,
          },
        ],
        width: '30px',
      },
    ];

    return (
      <Fragment>
        <EuiBasicTable items={items} columns={columns} style={{ maxWidth: '400px' }} />
        <EuiSpacer size="m" />
        <EuiButton iconType="plusInCircle" size="s" onClick={this.addLookup}>
          <FormattedMessage
            id="indexPatternManagement.staticLookup.addEntryButton"
            defaultMessage="Add entry"
          />
        </EuiButton>
        <EuiSpacer size="l" />
        <EuiFormRow
          label={
            <FormattedMessage
              id="indexPatternManagement.staticLookup.unknownKeyLabel"
              defaultMessage="Value for unknown key"
            />
          }
        >
          <EuiFieldText
            value={formatParams.unknownKeyValue || ''}
            placeholder={i18n.translate(
              'indexPatternManagement.staticLookup.leaveBlankPlaceholder',
              {
                defaultMessage: 'Leave blank to keep value as-is',
              }
            )}
            onChange={(e) => {
              this.onChange({ unknownKeyValue: e.target.value });
            }}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
      </Fragment>
    );
  }
}
