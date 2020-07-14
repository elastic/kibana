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
import { EuiButton, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DiscoverFieldDetails } from './discover_field_details';
import { FieldIcon } from '../../../../../kibana_react/public';
import { FieldDetails } from './types';
import { IndexPatternField, IndexPattern } from '../../../../../data/public';
import { shortenDottedString } from '../../helpers';
import { getFieldTypeName } from './lib/get_field_type_name';

export interface DiscoverFieldProps {
  /**
   * The displayed field
   */
  field: IndexPatternField;
  /**
   * The currently selected index pattern
   */
  indexPattern: IndexPattern;
  /**
   * Callback to add/select the field
   */
  onAddField: (fieldName: string) => void;
  /**
   * Callback to add a filter to filter bar
   */
  onAddFilter: (field: IndexPatternField | string, value: string, type: '+' | '-') => void;
  /**
   * Callback to remove/deselect a the field
   * @param fieldName
   */
  onRemoveField: (fieldName: string) => void;
  /**
   * Callback to hide/show details, buckets of the field
   */
  onShowDetails: (show: boolean, field: IndexPatternField) => void;
  /**
   * Determines, whether details of the field are displayed
   */
  showDetails: boolean;
  /**
   * Retrieve details data for the field
   */
  getDetails: (field: IndexPatternField) => FieldDetails;
  /**
   * Determines whether the field is selected
   */
  selected?: boolean;
  /**
   * Determines whether the field name is shortened test.sub1.sub2 = t.s.sub2
   */
  useShortDots?: boolean;
}

export function DiscoverField({
  field,
  indexPattern,
  onAddField,
  onRemoveField,
  onAddFilter,
  onShowDetails,
  showDetails,
  getDetails,
  selected,
  useShortDots,
}: DiscoverFieldProps) {
  const addLabel = i18n.translate('discover.fieldChooser.discoverField.addButtonLabel', {
    defaultMessage: 'Add',
  });
  const addLabelAria = i18n.translate('discover.fieldChooser.discoverField.addButtonAriaLabel', {
    defaultMessage: 'Add {field} to table',
    values: { field: field.name },
  });
  const removeLabel = i18n.translate('discover.fieldChooser.discoverField.removeButtonLabel', {
    defaultMessage: 'Remove',
  });
  const removeLabelAria = i18n.translate(
    'discover.fieldChooser.discoverField.removeButtonAriaLabel',
    {
      defaultMessage: 'Remove {field} from table',
      values: { field: field.name },
    }
  );

  const toggleDisplay = (f: IndexPatternField) => {
    if (selected) {
      onRemoveField(f.name);
    } else {
      onAddField(f.name);
    }
  };

  return (
    <>
      <div
        className={`dscSidebarField dscSidebarItem ${showDetails ? 'dscSidebarItem--active' : ''}`}
        tabIndex={0}
        onClick={() => onShowDetails(!showDetails, field)}
        onKeyPress={() => onShowDetails(!showDetails, field)}
        data-test-subj={`field-${field.name}-showDetails`}
      >
        <span className="dscSidebarField__fieldIcon">
          <FieldIcon
            type={field.type}
            label={getFieldTypeName(field.type)}
            scripted={field.scripted}
          />
        </span>
        <span className="dscSidebarField__name eui-textTruncate">
          <EuiText
            size="xs"
            data-test-subj={`field-${field.name}`}
            className="eui-textTruncate"
            title={field.name}
          >
            {useShortDots ? shortenDottedString(field.name) : field.displayName}
          </EuiText>
        </span>
        <span>
          {field.name !== '_source' && !selected && (
            <EuiButton
              fill
              size="s"
              className="dscSidebarItem__action"
              onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
                ev.preventDefault();
                ev.stopPropagation();
                toggleDisplay(field);
              }}
              data-test-subj={`fieldToggle-${field.name}`}
              arial-label={addLabelAria}
            >
              {addLabel}
            </EuiButton>
          )}
          {field.name !== '_source' && selected && (
            <EuiButton
              color="danger"
              className="dscSidebarItem__action"
              onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
                ev.preventDefault();
                ev.stopPropagation();
                toggleDisplay(field);
              }}
              data-test-subj={`fieldToggle-${field.name}`}
              arial-label={removeLabelAria}
            >
              {removeLabel}
            </EuiButton>
          )}
        </span>
      </div>
      {showDetails && (
        <DiscoverFieldDetails
          indexPattern={indexPattern}
          field={field}
          details={getDetails(field)}
          onAddFilter={onAddFilter}
        />
      )}
    </>
  );
}
