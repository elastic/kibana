/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';

import { EuiBasicTable, EuiButton, EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DefaultFormatEditor } from '../default/default';
import { formatId } from './constants';

export interface StaticLookupFormatEditorFormatParams {
  lookupEntries: Array<{ key: string; value: string }>;
  unknownKeyValue: string;
}

interface StaticLookupItem {
  key: string;
  value: string;
  index: number;
}

export class StaticLookupFormatEditor extends DefaultFormatEditor<StaticLookupFormatEditorFormatParams> {
  static formatId = formatId;
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
    const lookupEntries = [...(this.props.formatParams.lookupEntries || [])];
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
            id="indexPatternFieldEditor.staticLookup.keyLabel"
            defaultMessage="Key"
          />
        ),
        render: (value: number, item: StaticLookupItem) => {
          return (
            <EuiFieldText
              value={value || ''}
              data-test-subj={`staticLookupEditorKey ${item.index}`}
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
            id="indexPatternFieldEditor.staticLookup.valueLabel"
            defaultMessage="Value"
          />
        ),
        render: (value: number, item: StaticLookupItem) => {
          return (
            <EuiFieldText
              value={value || ''}
              data-test-subj={`staticLookupEditorValue ${item.index}`}
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
        name: i18n.translate('indexPatternFieldEditor.staticLookup.actions', {
          defaultMessage: 'actions',
        }),
        actions: [
          {
            name: i18n.translate('indexPatternFieldEditor.staticLookup.deleteAria', {
              defaultMessage: 'Delete',
            }),
            description: i18n.translate('indexPatternFieldEditor.staticLookup.deleteTitle', {
              defaultMessage: 'Delete entry',
            }),
            onClick: (item: StaticLookupItem) => {
              this.removeLookup(item.index);
            },
            type: 'icon',
            icon: 'trash',
            color: 'danger',
            'data-test-subj': 'staticLookupEditorRemoveEntry',
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
        <EuiButton
          iconType="plusInCircle"
          size="s"
          onClick={this.addLookup}
          data-test-subj={'staticLookupEditorAddEntry'}
        >
          <FormattedMessage
            id="indexPatternFieldEditor.staticLookup.addEntryButton"
            defaultMessage="Add entry"
          />
        </EuiButton>
        <EuiSpacer size="l" />
        <EuiFormRow
          label={
            <FormattedMessage
              id="indexPatternFieldEditor.staticLookup.unknownKeyLabel"
              defaultMessage="Value for unknown key"
            />
          }
        >
          <EuiFieldText
            value={formatParams.unknownKeyValue || ''}
            data-test-subj={'staticLookupEditorUnknownValue'}
            placeholder={i18n.translate(
              'indexPatternFieldEditor.staticLookup.leaveBlankPlaceholder',
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
