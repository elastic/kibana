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
import React, { useState } from 'react';
import { EuiButton, EuiPopover, EuiPopoverTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DiscoverFieldDetails } from './discover_field_details';
import { FieldIcon, FieldButton, FieldButtonProps } from '../../../../../kibana_react/public';
import { FieldDetails } from './types';
import { IndexPatternField, IndexPattern } from '../../../../../data/public';
import { shortenDottedString } from '../../helpers';
import { getFieldTypeName } from './lib/get_field_type_name';
import './discover_field.scss';

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

  const [infoIsOpen, setOpen] = useState(false);

  const toggleDisplay = (f: IndexPatternField) => {
    if (selected) {
      onRemoveField(f.name);
    } else {
      onAddField(f.name);
    }
  };

  function togglePopover() {
    // if (hideDetails) {
    //   return;
    // }

    setOpen(!infoIsOpen);
    // if (!infoIsOpen) {
    //   trackUiEvent('indexpattern_field_info_click');
    //   fetchData();
    // }
  }

  function wrapOnDot(str?: string) {
    // u200B is a non-width white-space character, which allows
    // the browser to efficiently word-wrap right after the dot
    // without us having to draw a lot of extra DOM elements, etc
    return str ? str.replace(/\./g, '.\u200B') : '';
  }

  const dscFieldIcon = (
    <FieldIcon type={field.type} label={getFieldTypeName(field.type)} scripted={field.scripted} />
  );

  const fieldName = (
    <span
      data-test-subj={`field-${field.name}`}
      title={field.name}
      className="dscSidebarField__name"
    >
      {useShortDots ? wrapOnDot(shortenDottedString(field.name)) : wrapOnDot(field.displayName)}
    </span>
  );

  let actionButton;
  if (field.name !== '_source' && !selected) {
    actionButton = (
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
    );
  } else if (field.name !== '_source' && selected) {
    actionButton = (
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
    );
  }

  return (
    <>
      <EuiPopover
        display="block"
        button={
          <FieldButton
            // className={`dscSidebarField dscSidebarItem ${
            //   showDetails ? 'dscSidebarItem--active' : ''
            // }`}
            className="dscSidebarItem"
            isOpen={showDetails}
            tabIndex={0}
            // onClick={() => onShowDetails(!showDetails, field)}
            // onKeyPress={() => onShowDetails(!showDetails, field)}
            onClick={() => {
              togglePopover();
            }}
            onKeyPress={(event) => {
              if (event.key === 'ENTER') {
                togglePopover();
              }
            }}
            data-test-subj={`field-${field.name}-showDetails`}
            fieldIcon={dscFieldIcon}
            fieldAction={actionButton}
            fieldName={fieldName}
          />
        }
        isOpen={infoIsOpen}
        closePopover={() => setOpen(false)}
        anchorPosition="rightUp"
        panelClassName="dscSidebarItem__fieldPopoverPanel"
      >
        <EuiPopoverTitle>
          {' '}
          {i18n.translate('discover.fieldChooser.discoverField.fieldTopValuesLabel', {
            defaultMessage: 'Top values',
          })}
        </EuiPopoverTitle>
        <DiscoverFieldDetails
          indexPattern={indexPattern}
          field={field}
          details={getDetails(field)}
          onAddFilter={onAddFilter}
        />
      </EuiPopover>

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
