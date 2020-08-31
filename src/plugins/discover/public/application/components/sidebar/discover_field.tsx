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
import { EuiPopover, EuiPopoverTitle, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DiscoverFieldDetails } from './discover_field_details';
import { FieldIcon, FieldButton } from '../../../../../kibana_react/public';
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
  getDetails,
  selected,
  useShortDots,
}: DiscoverFieldProps) {
  const addLabelAria = i18n.translate('discover.fieldChooser.discoverField.addButtonAriaLabel', {
    defaultMessage: 'Add {field} to table',
    values: { field: field.name },
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
    setOpen(!infoIsOpen);
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
      <EuiToolTip
        delay="long"
        content={i18n.translate('discover.fieldChooser.discoverField.addFieldTooltip', {
          defaultMessage: 'Add field as column',
        })}
      >
        <EuiButtonIcon
          iconType="plusInCircleFilled"
          className="dscSidebarItem__action"
          onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
            ev.preventDefault();
            ev.stopPropagation();
            toggleDisplay(field);
          }}
          data-test-subj={`fieldToggle-${field.name}`}
          aria-label={addLabelAria}
        />
      </EuiToolTip>
    );
  } else if (field.name !== '_source' && selected) {
    actionButton = (
      <EuiToolTip
        delay="long"
        content={i18n.translate('discover.fieldChooser.discoverField.removeFieldTooltip', {
          defaultMessage: 'Remove field from table',
        })}
      >
        <EuiButtonIcon
          color="danger"
          iconType="cross"
          className="dscSidebarItem__action"
          onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
            ev.preventDefault();
            ev.stopPropagation();
            toggleDisplay(field);
          }}
          data-test-subj={`fieldToggle-${field.name}`}
          aria-label={removeLabelAria}
        />
      </EuiToolTip>
    );
  }

  return (
    <EuiPopover
      ownFocus
      display="block"
      button={
        <FieldButton
          size="s"
          className="dscSidebarItem"
          isActive={infoIsOpen}
          onClick={() => {
            togglePopover();
          }}
          buttonProps={{ 'data-test-subj': `field-${field.name}-showDetails` }}
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
          defaultMessage: 'Top 5 values',
        })}
      </EuiPopoverTitle>
      {infoIsOpen && (
        <DiscoverFieldDetails
          indexPattern={indexPattern}
          field={field}
          details={getDetails(field)}
          onAddFilter={onAddFilter}
        />
      )}
    </EuiPopover>
  );
}
