/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import './discover_field.scss';

import React, { useState } from 'react';
import { EuiPopover, EuiPopoverTitle, EuiButtonIcon, EuiToolTip, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UiCounterMetricType } from '@kbn/analytics';
import classNames from 'classnames';
import { DiscoverFieldDetails } from './discover_field_details';
import { FieldIcon, FieldButton } from '../../../../../kibana_react/public';
import { FieldDetails } from './types';
import { IndexPatternField, IndexPattern } from '../../../../../data/public';
import { getFieldTypeName } from './lib/get_field_type_name';
import { DiscoverFieldDetailsFooter } from './discover_field_details_footer';

export interface DiscoverFieldProps {
  /**
   * Determines whether add/remove button is displayed not only when focused
   */
  alwaysShowActionButton?: boolean;
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
   * Metric tracking function
   * @param metricType
   * @param eventName
   */
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;

  multiFields?: Array<{ field: IndexPatternField; isSelected: boolean }>;
}

export function DiscoverField({
  alwaysShowActionButton = false,
  field,
  indexPattern,
  onAddField,
  onRemoveField,
  onAddFilter,
  getDetails,
  selected,
  trackUiMetric,
  multiFields,
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

  const toggleDisplay = (f: IndexPatternField, isSelected: boolean) => {
    if (isSelected) {
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

  const getDscFieldIcon = (indexPatternField: IndexPatternField) => {
    return (
      <FieldIcon
        type={indexPatternField.type}
        label={getFieldTypeName(indexPatternField.type)}
        scripted={indexPatternField.scripted}
      />
    );
  };

  const dscFieldIcon = getDscFieldIcon(field);

  const getTitle = (indexPatternField: IndexPatternField) => {
    return indexPatternField.displayName !== indexPatternField.name
      ? i18n.translate('discover.field.title', {
          defaultMessage: '{fieldName} ({fieldDisplayName})',
          values: {
            fieldName: indexPatternField.name,
            fieldDisplayName: indexPatternField.displayName,
          },
        })
      : indexPatternField.displayName;
  };

  const getFieldName = (indexPatternField: IndexPatternField) => {
    return (
      <span
        data-test-subj={`field-${indexPatternField.name}`}
        title={getTitle(indexPatternField)}
        className="dscSidebarField__name"
      >
        {wrapOnDot(indexPatternField.displayName)}
      </span>
    );
  };
  const fieldName = getFieldName(field);

  const actionBtnClassName = classNames('dscSidebarItem__action', {
    ['dscSidebarItem__mobile']: alwaysShowActionButton,
  });
  const getActionButton = (f: IndexPatternField, isSelected?: boolean) => {
    if (f.name !== '_source' && !isSelected) {
      return (
        <EuiToolTip
          delay="long"
          content={i18n.translate('discover.fieldChooser.discoverField.addFieldTooltip', {
            defaultMessage: 'Add field as column',
          })}
        >
          <EuiButtonIcon
            iconType="plusInCircleFilled"
            className={actionBtnClassName}
            onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
              if (ev.type === 'click') {
                ev.currentTarget.focus();
              }
              ev.preventDefault();
              ev.stopPropagation();
              toggleDisplay(f, false);
            }}
            data-test-subj={`fieldToggle-${f.name}`}
            aria-label={addLabelAria}
          />
        </EuiToolTip>
      );
    } else if (f.name !== '_source' && isSelected) {
      return (
        <EuiToolTip
          delay="long"
          content={i18n.translate('discover.fieldChooser.discoverField.removeFieldTooltip', {
            defaultMessage: 'Remove field from table',
          })}
        >
          <EuiButtonIcon
            color="danger"
            iconType="cross"
            className={actionBtnClassName}
            onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
              if (ev.type === 'click') {
                ev.currentTarget.focus();
              }
              ev.preventDefault();
              ev.stopPropagation();
              toggleDisplay(f, isSelected);
            }}
            data-test-subj={`fieldToggle-${f.name}`}
            aria-label={removeLabelAria}
          />
        </EuiToolTip>
      );
    }
  };

  const actionButton = getActionButton(field, selected);

  if (field.type === '_source') {
    return (
      <FieldButton
        size="s"
        className="dscSidebarItem"
        dataTestSubj={`field-${field.name}-showDetails`}
        fieldIcon={dscFieldIcon}
        fieldAction={actionButton}
        fieldName={fieldName}
      />
    );
  }

  const shouldRenderMultiFields = !!multiFields;
  const renderMultiFields = () => {
    if (!multiFields) {
      return null;
    }
    return (
      <React.Fragment>
        <EuiTitle size="xxxs">
          <h5>
            {i18n.translate('discover.fieldChooser.discoverField.multiFields', {
              defaultMessage: 'Multi fields',
            })}
          </h5>
        </EuiTitle>
        {multiFields.map((entry) => (
          <FieldButton
            size="s"
            className="dscSidebarItem dscSidebarItem--multi"
            isActive={false}
            onClick={() => {}}
            dataTestSubj={`field-${entry.field.name}-showDetails`}
            fieldIcon={getDscFieldIcon(entry.field)}
            fieldAction={getActionButton(entry.field, entry.isSelected)}
            fieldName={getFieldName(entry.field)}
            key={entry.field.name}
          />
        ))}
      </React.Fragment>
    );
  };

  return (
    <EuiPopover
      display="block"
      button={
        <FieldButton
          size="s"
          className="dscSidebarItem"
          isActive={infoIsOpen}
          onClick={() => {
            togglePopover();
          }}
          dataTestSubj={`field-${field.name}-showDetails`}
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
      <EuiPopoverTitle style={{ textTransform: 'none' }}>{field.displayName}</EuiPopoverTitle>
      <EuiTitle size="xxxs">
        <h5>
          {i18n.translate('discover.fieldChooser.discoverField.fieldTopValuesLabel', {
            defaultMessage: 'Top 5 values',
          })}
        </h5>
      </EuiTitle>
      {infoIsOpen && (
        <DiscoverFieldDetails
          indexPattern={indexPattern}
          field={field}
          details={getDetails(field)}
          onAddFilter={onAddFilter}
          trackUiMetric={trackUiMetric}
          showFooter={!shouldRenderMultiFields}
        />
      )}
      {shouldRenderMultiFields ? (
        <>
          {renderMultiFields()}
          <DiscoverFieldDetailsFooter
            indexPattern={indexPattern}
            field={field}
            details={getDetails(field)}
            onAddFilter={onAddFilter}
          />
        </>
      ) : null}
    </EuiPopover>
  );
}
