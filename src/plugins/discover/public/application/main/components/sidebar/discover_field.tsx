/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './discover_field.scss';

import React, { useState, useCallback, memo, useMemo } from 'react';
import {
  EuiPopover,
  EuiPopoverTitle,
  EuiButtonIcon,
  EuiToolTip,
  EuiTitle,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UiCounterMetricType } from '@kbn/analytics';
import classNames from 'classnames';
import { FieldButton, FieldIcon } from '@kbn/react-field';
import { DiscoverFieldDetails } from './discover_field_details';
import { FieldDetails } from './types';
import type { DataViewField, DataView } from '../../../../../../data_views/public';
import { getFieldTypeName } from './lib/get_field_type_name';
import { DiscoverFieldVisualize } from './discover_field_visualize';

function wrapOnDot(str?: string) {
  // u200B is a non-width white-space character, which allows
  // the browser to efficiently word-wrap right after the dot
  // without us having to draw a lot of extra DOM elements, etc
  return str ? str.replace(/\./g, '.\u200B') : '';
}

const FieldInfoIcon: React.FC = memo(() => (
  <EuiToolTip
    position="bottom"
    content={i18n.translate('discover.field.mappingConflict', {
      defaultMessage:
        'This field is defined as several types (string, integer, etc) across the indices that match this pattern.' +
        'You may still be able to use this conflicting field, but it will be unavailable for functions that require Kibana to know their type. Correcting this issue will require reindexing your data.',
    })}
  >
    <EuiIcon
      tabIndex={0}
      type="alert"
      title={i18n.translate('discover.field.mappingConflict.title', {
        defaultMessage: 'Mapping Conflict',
      })}
      size="s"
    />
  </EuiToolTip>
));

/**
 * Extracts the type from a data view field that will match the right icon.
 *
 * We define custom logic for Discover in order to distinguish between various "string" types.
 */
export const getTypeForFieldIcon = (field: DataViewField) =>
  field.type === 'string' && field.esTypes ? field.esTypes[0] : field.type;

const DiscoverFieldTypeIcon: React.FC<{ field: DataViewField }> = memo(({ field }) => {
  const typeForIcon = getTypeForFieldIcon(field);
  return (
    <FieldIcon type={typeForIcon} label={getFieldTypeName(typeForIcon)} scripted={field.scripted} />
  );
});

const FieldName: React.FC<{ field: DataViewField }> = memo(({ field }) => {
  const title =
    field.displayName !== field.name
      ? i18n.translate('discover.field.title', {
          defaultMessage: '{fieldName} ({fieldDisplayName})',
          values: {
            fieldName: field.name,
            fieldDisplayName: field.displayName,
          },
        })
      : field.displayName;

  return (
    <span data-test-subj={`field-${field.name}`} title={title} className="dscSidebarField__name">
      {wrapOnDot(field.displayName)}
    </span>
  );
});

interface ActionButtonProps {
  field: DataViewField;
  isSelected?: boolean;
  alwaysShow: boolean;
  toggleDisplay: (field: DataViewField) => void;
}

const ActionButton: React.FC<ActionButtonProps> = memo(
  ({ field, isSelected, alwaysShow, toggleDisplay }) => {
    const actionBtnClassName = classNames('dscSidebarItem__action', {
      ['dscSidebarItem__mobile']: alwaysShow,
    });
    if (field.name === '_source') {
      return null;
    }
    if (!isSelected) {
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
              toggleDisplay(field);
            }}
            data-test-subj={`fieldToggle-${field.name}`}
            aria-label={i18n.translate('discover.fieldChooser.discoverField.addButtonAriaLabel', {
              defaultMessage: 'Add {field} to table',
              values: { field: field.name },
            })}
          />
        </EuiToolTip>
      );
    } else {
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
              toggleDisplay(field);
            }}
            data-test-subj={`fieldToggle-${field.name}`}
            aria-label={i18n.translate(
              'discover.fieldChooser.discoverField.removeButtonAriaLabel',
              {
                defaultMessage: 'Remove {field} from table',
                values: { field: field.name },
              }
            )}
          />
        </EuiToolTip>
      );
    }
  }
);

interface MultiFieldsProps {
  multiFields: NonNullable<DiscoverFieldProps['multiFields']>;
  toggleDisplay: (field: DataViewField) => void;
  alwaysShowActionButton: boolean;
}

const MultiFields: React.FC<MultiFieldsProps> = memo(
  ({ multiFields, toggleDisplay, alwaysShowActionButton }) => (
    <React.Fragment>
      <EuiTitle size="xxxs">
        <h5>
          {i18n.translate('discover.fieldChooser.discoverField.multiFields', {
            defaultMessage: 'Multi fields',
          })}
        </h5>
      </EuiTitle>
      <EuiSpacer size="xs" />
      {multiFields.map((entry) => (
        <FieldButton
          size="s"
          className="dscSidebarItem dscSidebarItem--multi"
          isActive={false}
          dataTestSubj={`field-${entry.field.name}-showDetails`}
          fieldIcon={<DiscoverFieldTypeIcon field={entry.field} />}
          fieldAction={
            <ActionButton
              field={entry.field}
              isSelected={entry.isSelected}
              alwaysShow={alwaysShowActionButton}
              toggleDisplay={toggleDisplay}
            />
          }
          fieldName={<FieldName field={entry.field} />}
          key={entry.field.name}
        />
      ))}
    </React.Fragment>
  )
);

export interface DiscoverFieldProps {
  /**
   * Determines whether add/remove button is displayed not only when focused
   */
  alwaysShowActionButton?: boolean;
  /**
   * The displayed field
   */
  field: DataViewField;
  /**
   * The currently selected index pattern
   */
  indexPattern: DataView;
  /**
   * Callback to add/select the field
   */
  onAddField: (fieldName: string) => void;
  /**
   * Callback to add a filter to filter bar
   */
  onAddFilter: (field: DataViewField | string, value: string, type: '+' | '-') => void;
  /**
   * Callback to remove/deselect a the field
   * @param fieldName
   */
  onRemoveField: (fieldName: string) => void;
  /**
   * Retrieve details data for the field
   */
  getDetails: (field: DataViewField) => FieldDetails;
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

  multiFields?: Array<{ field: DataViewField; isSelected: boolean }>;

  /**
   * Callback to edit a runtime field from index pattern
   * @param fieldName name of the field to edit
   */
  onEditField?: (fieldName: string) => void;

  /**
   * Callback to delete a runtime field from index pattern
   * @param fieldName name of the field to delete
   */
  onDeleteField?: (fieldName: string) => void;

  /**
   * Optionally show or hide field stats in the popover
   */
  showFieldStats?: boolean;
}

function DiscoverFieldComponent({
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
  onEditField,
  onDeleteField,
  showFieldStats,
}: DiscoverFieldProps) {
  const [infoIsOpen, setOpen] = useState(false);

  const toggleDisplay = useCallback(
    (f: DataViewField) => {
      if (selected) {
        onRemoveField(f.name);
      } else {
        onAddField(f.name);
      }
    },
    [onAddField, onRemoveField, selected]
  );

  const togglePopover = useCallback(() => {
    setOpen(!infoIsOpen);
  }, [infoIsOpen]);

  const rawMultiFields = useMemo(() => multiFields?.map((f) => f.field), [multiFields]);

  if (field.type === '_source') {
    return (
      <FieldButton
        size="s"
        className="dscSidebarItem"
        dataTestSubj={`field-${field.name}-showDetails`}
        fieldIcon={<DiscoverFieldTypeIcon field={field} />}
        fieldAction={
          <ActionButton
            field={field}
            isSelected={selected}
            alwaysShow={alwaysShowActionButton}
            toggleDisplay={toggleDisplay}
          />
        }
        fieldName={<FieldName field={field} />}
      />
    );
  }

  const isRuntimeField = Boolean(indexPattern.getFieldByName(field.name)?.runtimeField);
  const isUnknownField = field.type === 'unknown' || field.type === 'unknown_selected';
  const canEditField = onEditField && (!isUnknownField || isRuntimeField);
  const canDeleteField = onDeleteField && isRuntimeField;
  const popoverTitle = (
    <EuiPopoverTitle style={{ textTransform: 'none' }} className="eui-textBreakWord">
      <EuiFlexGroup responsive={false} gutterSize="s">
        <EuiFlexItem grow={true}>
          <h5>{field.displayName}</h5>
        </EuiFlexItem>
        {canEditField && (
          <EuiFlexItem grow={false} data-test-subj="discoverFieldListPanelEditItem">
            <EuiButtonIcon
              onClick={() => {
                if (onEditField) {
                  togglePopover();
                  onEditField(field.name);
                }
              }}
              iconType="pencil"
              data-test-subj={`discoverFieldListPanelEdit-${field.name}`}
              aria-label={i18n.translate('discover.fieldChooser.discoverField.editFieldLabel', {
                defaultMessage: 'Edit data view field',
              })}
            />
          </EuiFlexItem>
        )}
        {canDeleteField && (
          <EuiFlexItem grow={false} data-test-subj="discoverFieldListPanelDeleteItem">
            <EuiToolTip
              content={i18n.translate('discover.fieldChooser.discoverField.deleteFieldLabel', {
                defaultMessage: 'Delete data view field',
              })}
            >
              <EuiButtonIcon
                onClick={() => {
                  onDeleteField?.(field.name);
                }}
                iconType="trash"
                data-test-subj={`discoverFieldListPanelDelete-${field.name}`}
                color="danger"
                aria-label={i18n.translate('discover.fieldChooser.discoverField.deleteFieldLabel', {
                  defaultMessage: 'Delete data view field',
                })}
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPopoverTitle>
  );

  const renderPopover = () => {
    const details = getDetails(field);
    return (
      <>
        {showFieldStats && (
          <>
            <EuiTitle size="xxxs">
              <h5>
                {i18n.translate('discover.fieldChooser.discoverField.fieldTopValuesLabel', {
                  defaultMessage: 'Top 5 values',
                })}
              </h5>
            </EuiTitle>
            <DiscoverFieldDetails
              indexPattern={indexPattern}
              field={field}
              details={details}
              onAddFilter={onAddFilter}
            />
          </>
        )}

        {multiFields && (
          <>
            {showFieldStats && <EuiSpacer size="m" />}
            <MultiFields
              multiFields={multiFields}
              alwaysShowActionButton={alwaysShowActionButton}
              toggleDisplay={toggleDisplay}
            />
          </>
        )}
        {(showFieldStats || multiFields) && <EuiHorizontalRule margin="m" />}
        <DiscoverFieldVisualize
          field={field}
          indexPattern={indexPattern}
          multiFields={rawMultiFields}
          trackUiMetric={trackUiMetric}
          details={details}
        />
      </>
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
          onClick={togglePopover}
          dataTestSubj={`field-${field.name}-showDetails`}
          fieldIcon={<DiscoverFieldTypeIcon field={field} />}
          fieldAction={
            <ActionButton
              field={field}
              isSelected={selected}
              alwaysShow={alwaysShowActionButton}
              toggleDisplay={toggleDisplay}
            />
          }
          fieldName={<FieldName field={field} />}
          fieldInfoIcon={field.type === 'conflict' && <FieldInfoIcon />}
        />
      }
      isOpen={infoIsOpen}
      closePopover={() => setOpen(false)}
      anchorPosition="rightUp"
      panelClassName="dscSidebarItem__fieldPopoverPanel"
    >
      {popoverTitle}
      {infoIsOpen && renderPopover()}
    </EuiPopover>
  );
}

export const DiscoverField = memo(DiscoverFieldComponent);
