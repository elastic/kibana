/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './discover_field.scss';

import React, { useState, useCallback, memo, useMemo } from 'react';
import { EuiButtonIcon, EuiToolTip, EuiTitle, EuiIcon, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UiCounterMetricType } from '@kbn/analytics';
import classNames from 'classnames';
import { FieldButton, FieldIcon } from '@kbn/react-field';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/public';
import {
  FieldStats,
  FieldPopover,
  FieldPopoverHeader,
  FieldPopoverHeaderProps,
  FieldPopoverVisualize,
} from '@kbn/unified-field-list-plugin/public';
import { getTypeForFieldIcon } from '../../../../utils/get_type_for_field_icon';
import { DiscoverFieldDetails } from './discover_field_details';
import { FieldDetails } from './types';
import { getFieldTypeName } from '../../../../utils/get_field_type_name';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { SHOW_LEGACY_FIELD_TOP_VALUES, PLUGIN_ID } from '../../../../../common';
import { getUiActions } from '../../../../kibana_services';
import { useAppStateSelector } from '../../services/discover_app_state_container';

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
  toggleDisplay: (field: DataViewField, isSelected?: boolean) => void;
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
              toggleDisplay(field, isSelected);
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
              toggleDisplay(field, isSelected);
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
  isDocumentRecord: boolean;
}

const MultiFields: React.FC<MultiFieldsProps> = memo(
  ({ multiFields, toggleDisplay, alwaysShowActionButton, isDocumentRecord }) => (
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
          fieldIcon={isDocumentRecord && <DiscoverFieldTypeIcon field={entry.field} />}
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
   * The currently selected data view
   */
  dataView: DataView;
  /**
   * Callback to add/select the field
   */
  onAddField: (fieldName: string) => void;
  /**
   * Callback to add a filter to filter bar
   */
  onAddFilter?: (field: DataViewField | string, value: unknown, type: '+' | '-') => void;
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
   * Callback to edit a field from data view
   * @param fieldName name of the field to edit
   */
  onEditField?: (fieldName: string) => void;

  /**
   * Callback to delete a runtime field from data view
   * @param fieldName name of the field to delete
   */
  onDeleteField?: (fieldName: string) => void;

  /**
   * Optionally show or hide field stats in the popover
   */
  showFieldStats?: boolean;
  /**
   * Columns
   */
  contextualFields: string[];
}

function DiscoverFieldComponent({
  alwaysShowActionButton = false,
  field,
  dataView,
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
  contextualFields,
}: DiscoverFieldProps) {
  const services = useDiscoverServices();
  const { data } = services;
  const [infoIsOpen, setOpen] = useState(false);
  const isDocumentRecord = !!onAddFilter;
  const query = useAppStateSelector((state) => state.query);
  const filters = useAppStateSelector((state) => state.filters);

  const addFilterAndClosePopover: typeof onAddFilter | undefined = useMemo(
    () =>
      onAddFilter
        ? (...params) => {
            setOpen(false);
            onAddFilter?.(...params);
          }
        : undefined,
    [setOpen, onAddFilter]
  );

  const togglePopover = useCallback(() => {
    setOpen((value) => !value);
  }, [setOpen]);

  const closePopover = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const toggleDisplay: ActionButtonProps['toggleDisplay'] = useCallback(
    (f, isCurrentlySelected) => {
      closePopover();
      if (isCurrentlySelected) {
        onRemoveField(f.name);
      } else {
        onAddField(f.name);
      }
    },
    [onAddField, onRemoveField, closePopover]
  );

  const rawMultiFields = useMemo(() => multiFields?.map((f) => f.field), [multiFields]);

  const customPopoverHeaderProps: Partial<FieldPopoverHeaderProps> = useMemo(
    () => ({
      buttonAddFieldToWorkspaceProps: {
        'aria-label': i18n.translate('discover.fieldChooser.discoverField.addFieldTooltip', {
          defaultMessage: 'Add field as column',
        }),
      },
      buttonAddFilterProps: {
        'data-test-subj': `discoverFieldListPanelAddExistFilter-${field.name}`,
      },
      buttonEditFieldProps: {
        'data-test-subj': `discoverFieldListPanelEdit-${field.name}`,
      },
      buttonDeleteFieldProps: {
        'data-test-subj': `discoverFieldListPanelDelete-${field.name}`,
      },
    }),
    [field.name]
  );

  if (field.type === '_source') {
    return (
      <FieldButton
        size="s"
        className="dscSidebarItem"
        dataTestSubj={`field-${field.name}-showDetails`}
        fieldIcon={isDocumentRecord && <DiscoverFieldTypeIcon field={field} />}
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

  const button = (
    <FieldButton
      size="s"
      className="dscSidebarItem"
      isActive={infoIsOpen}
      onClick={togglePopover}
      dataTestSubj={`field-${field.name}-showDetails`}
      fieldIcon={isDocumentRecord && <DiscoverFieldTypeIcon field={field} />}
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
  );

  if (!isDocumentRecord) {
    return button;
  }

  const renderPopover = () => {
    const dateRange = data?.query?.timefilter.timefilter.getAbsoluteTime();
    // prioritize an aggregatable multi field if available or take the parent field
    const fieldForStats =
      (multiFields?.length &&
        multiFields.find((multiField) => multiField.field.aggregatable)?.field) ||
      field;
    const showLegacyFieldStats = services.uiSettings.get(SHOW_LEGACY_FIELD_TOP_VALUES);

    return (
      <>
        {showLegacyFieldStats ? (
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
                  dataView={dataView}
                  field={field}
                  details={getDetails(field)}
                  onAddFilter={onAddFilter}
                />
              </>
            )}
          </>
        ) : (
          <>
            {Boolean(dateRange) && (
              <FieldStats
                services={services}
                query={query!}
                filters={filters!}
                fromDate={dateRange.from}
                toDate={dateRange.to}
                dataViewOrDataViewId={dataView}
                field={fieldForStats}
                data-test-subj="dscFieldStats"
                onAddFilter={addFilterAndClosePopover}
              />
            )}
          </>
        )}

        {multiFields && (
          <>
            {(showFieldStats || !showLegacyFieldStats) && <EuiSpacer size="m" />}
            <MultiFields
              multiFields={multiFields}
              alwaysShowActionButton={alwaysShowActionButton}
              toggleDisplay={toggleDisplay}
              isDocumentRecord={isDocumentRecord}
            />
          </>
        )}

        <FieldPopoverVisualize
          field={field}
          dataView={dataView}
          multiFields={rawMultiFields}
          trackUiMetric={trackUiMetric}
          contextualFields={contextualFields}
          originatingApp={PLUGIN_ID}
          uiActions={getUiActions()}
        />
      </>
    );
  };

  return (
    <FieldPopover
      isOpen={infoIsOpen}
      button={button}
      closePopover={closePopover}
      data-test-subj="discoverFieldListPanelPopover"
      renderHeader={() => (
        <FieldPopoverHeader
          field={field}
          closePopover={closePopover}
          onAddFieldToWorkspace={!selected ? toggleDisplay : undefined}
          onAddFilter={onAddFilter}
          onEditField={onEditField}
          onDeleteField={onDeleteField}
          {...customPopoverHeaderProps}
        />
      )}
      renderContent={renderPopover}
    />
  );
}

export const DiscoverField = memo(DiscoverFieldComponent);
