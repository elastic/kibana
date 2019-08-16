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
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldName } from 'ui/directives/field_name/field_name';

export interface Props {
  columns: string[];
  hit: Record<string, any>;
  indexPattern: any;
  filter: any;
  onAddColumn: (column: string) => void;
  onRemoveColumn: (column: string) => void;
}

export function DocViewTable({
  hit,
  indexPattern,
  filter,
  columns,
  onAddColumn,
  onRemoveColumn,
}: Props) {
  const mapping = indexPattern.fields.byName;
  const flattened = indexPattern.flattenHit(hit);
  const formatted = indexPattern.formatHit(hit, 'text');
  const fields = Object.keys(flattened).sort();
  const isColumnActive = (columnName: string) => columns.includes(columnName);
  const toggleColumn = (columnName: string) => {
    if (columns.includes(columnName)) {
      onRemoveColumn(columnName);
    } else {
      onAddColumn(columnName);
    }
  };

  const formatValue = (field: string) => {
    const value = flattened[field];
    if (Array.isArray(value) && value.every(v => typeof v !== 'object')) {
      return value.join(', ');
    } else if (Array.isArray(value)) {
      return <pre>{JSON.stringify(value, null, 2)}</pre>;
    } else if (typeof value === 'object') {
      return <pre>{JSON.stringify(value, null, 2)}</pre>;
    } else {
      return typeof formatted[field] === 'undefined' ? value : formatted[field];
    }
  };

  return (
    <table className="table table-condensed">
      <tbody>
        {fields.map(field => (
          <tr key={field} data-test-subj={`tableDocViewRow-${field}`}>
            {filter && (
              <td style={{ width: '80px' }}>
                {mapping[field] && mapping[field].filterable && (
                  <span>
                    <EuiToolTip
                      content={
                        <FormattedMessage
                          id="kbnDocViews.table.filterForValueButtonTooltip"
                          defaultMessage="Filter for value"
                        />
                      }
                    >
                      <button
                        onClick={() => filter(mapping[field], flattened[field], '+')}
                        data-test-subj="addInclusiveFilterButton"
                        className="kbnDocViewer__actionButton"
                        aria-label={i18n.translate(
                          'kbnDocViews.table.filterForValueButtonTooltip',
                          {
                            defaultMessage: 'Filter for value',
                          }
                        )}
                      >
                        <i className="fa fa-search-plus"></i>
                      </button>
                    </EuiToolTip>
                    <EuiToolTip
                      content={
                        <FormattedMessage
                          id="kbnDocViews.table.filterOutValueButtonAriaLabel"
                          defaultMessage="Filter out value"
                        />
                      }
                    >
                      <button
                        onClick={() => filter(mapping[field], flattened[field], '-')}
                        className="kbnDocViewer__actionButton"
                        aria-label={i18n.translate(
                          'kbnDocViews.table.filterOutValueButtonAriaLabel',
                          {
                            defaultMessage: 'Filter out value',
                          }
                        )}
                      >
                        <i className="fa fa-search-minus"></i>
                      </button>
                    </EuiToolTip>
                  </span>
                )}
                {mapping[field] && !mapping[field].filterable && (
                  <EuiToolTip
                    content={
                      <FormattedMessage
                        id="kbnDocViews.table.unindexedFieldsCanNotBeSearchedTooltip"
                        defaultMessage="Unindexed fields can not be searched"
                      />
                    }
                  >
                    <span className="kbnDocViewer__actionButton">
                      <i className="fa fa-search-plus text-muted" />
                      <i className="fa fa-search-minus text-muted" />
                    </span>
                  </EuiToolTip>
                )}
                {onAddColumn && onRemoveColumn && (
                  <EuiToolTip
                    content={
                      <FormattedMessage
                        id="kbnDocViews.table.toggleColumnInTableButtonTooltip"
                        defaultMessage="Toggle column in table"
                      />
                    }
                  >
                    <button
                      aria-pressed={isColumnActive(field)}
                      onClick={() => toggleColumn(field)}
                      className="kbnDocViewer__actionButton"
                    >
                      <i className="fa fa-columns" />
                    </button>
                  </EuiToolTip>
                )}
                {mapping[field] &&
                  !indexPattern.metaFields.includes(field) &&
                  !mapping[field].scripted && (
                    <EuiToolTip
                      content={
                        <FormattedMessage
                          id="kbnDocViews.table.filterForFieldPresentButtonTooltip"
                          defaultMessage="Filter for field present"
                        />
                      }
                    >
                      <button
                        onClick={() => filter('_exists_', field, '+')}
                        className="kbnDocViewer__actionButton"
                      >
                        <i className="fa fa-asterisk" />
                      </button>
                    </EuiToolTip>
                  )}
                {indexPattern.metaFields.includes(field) && (
                  <EuiToolTip
                    content={
                      <FormattedMessage
                        id="kbnDocViews.table.unableToFilterForPresenceOfMetaFieldsTooltip"
                        defaultMessage="Unable to filter for presence of meta fields"
                      />
                    }
                  >
                    <span className="kbnDocViewer__actionButton">
                      <i className="fa fa-asterisk text-muted" />
                    </span>
                  </EuiToolTip>
                )}
                {mapping[field] && mapping[field].scripted && (
                  <EuiToolTip
                    content={
                      <FormattedMessage
                        id="kbnDocViews.table.unableToFilterForPresenceOfMetaFieldsTooltip"
                        defaultMessage="Unable to filter for presence of meta fields"
                      />
                    }
                  >
                    <span className="kbnDocViewer__actionButton">
                      <i className="fa fa-asterisk text-muted" />
                    </span>
                  </EuiToolTip>
                )}
              </td>
            )}
            <td
              data-field-name={field}
              data-field-type={mapping[field] ? mapping[field].type : 'default'}
              className="kbnDocViewer__field"
              style={{ width: '160px' }}
            >
              <FieldName field={mapping[field]} fieldName={field}></FieldName>
            </td>
            <td>
              <div className="kbnDocViewer__value">{formatValue(field)}</div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
