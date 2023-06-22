/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './discover_field.scss';

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UiCounterMetricType } from '@kbn/analytics';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import {
  FieldItemButton,
  type FieldItemButtonProps,
  FieldPopover,
  FieldPopoverHeader,
  FieldPopoverHeaderProps,
  FieldPopoverFooter,
} from '@kbn/unified-field-list-plugin/public';
import { DragDrop } from '@kbn/dom-drag-drop';
import { DiscoverFieldStats } from './discover_field_stats';
import { PLUGIN_ID } from '../../../../../common';
import { getUiActions } from '../../../../kibana_services';

interface GetCommonFieldItemButtonPropsParams {
  field: DataViewField;
  isSelected: boolean;
  toggleDisplay: (field: DataViewField, isSelected?: boolean) => void;
}

function getCommonFieldItemButtonProps({
  field,
  isSelected,
  toggleDisplay,
}: GetCommonFieldItemButtonPropsParams): {
  field: FieldItemButtonProps<DataViewField>['field'];
  isSelected: FieldItemButtonProps<DataViewField>['isSelected'];
  dataTestSubj: FieldItemButtonProps<DataViewField>['dataTestSubj'];
  buttonAddFieldToWorkspaceProps: FieldItemButtonProps<DataViewField>['buttonAddFieldToWorkspaceProps'];
  buttonRemoveFieldFromWorkspaceProps: FieldItemButtonProps<DataViewField>['buttonRemoveFieldFromWorkspaceProps'];
  onAddFieldToWorkspace: FieldItemButtonProps<DataViewField>['onAddFieldToWorkspace'];
  onRemoveFieldFromWorkspace: FieldItemButtonProps<DataViewField>['onRemoveFieldFromWorkspace'];
} {
  const dataTestSubj = `fieldToggle-${field.name}`;
  const handler =
    field.name === '_source' ? undefined : (f: DataViewField) => toggleDisplay(f, isSelected);
  return {
    field,
    isSelected,
    dataTestSubj: `field-${field.name}-showDetails`,
    buttonAddFieldToWorkspaceProps: {
      'aria-label': i18n.translate('discover.fieldChooser.discoverField.addFieldTooltip', {
        defaultMessage: 'Add field as column',
      }),
      'data-test-subj': dataTestSubj,
    },
    buttonRemoveFieldFromWorkspaceProps: {
      'aria-label': i18n.translate('discover.fieldChooser.discoverField.removeFieldTooltip', {
        defaultMessage: 'Remove field from table',
      }),
      'data-test-subj': dataTestSubj,
    },
    onAddFieldToWorkspace: handler,
    onRemoveFieldFromWorkspace: handler,
  };
}

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
        <FieldItemButton
          key={entry.field.name}
          size="xs"
          className="dscSidebarItem dscSidebarItem--multi"
          flush="both"
          isEmpty={false}
          isActive={false}
          shouldAlwaysShowAction={alwaysShowActionButton}
          onClick={undefined}
          {...getCommonFieldItemButtonProps({
            field: entry.field,
            isSelected: entry.isSelected,
            toggleDisplay,
          })}
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
   * Callback to remove a field column from the table
   * @param fieldName
   */
  onRemoveField: (fieldName: string) => void;
  /**
   * Determines whether the field is empty
   */
  isEmpty: boolean;
  /**
   * Determines whether the field is selected
   */
  isSelected: boolean;
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
   * Columns
   */
  contextualFields: string[];

  /**
   * Search by field name
   */
  highlight?: string;

  /**
   * Group index in the field list
   */
  groupIndex: number;

  /**
   * Item index in the field list
   */
  itemIndex: number;
}

function DiscoverFieldComponent({
  alwaysShowActionButton = false,
  field,
  highlight,
  dataView,
  onAddField,
  onRemoveField,
  onAddFilter,
  isEmpty,
  isSelected,
  trackUiMetric,
  multiFields,
  onEditField,
  onDeleteField,
  contextualFields,
  groupIndex,
  itemIndex,
}: DiscoverFieldProps) {
  const [infoIsOpen, setOpen] = useState(false);
  const isDocumentRecord = !!onAddFilter;

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

  const toggleDisplay: GetCommonFieldItemButtonPropsParams['toggleDisplay'] = useCallback(
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

  const renderPopover = () => {
    return (
      <>
        <DiscoverFieldStats
          field={field}
          multiFields={multiFields}
          dataView={dataView}
          onAddFilter={addFilterAndClosePopover}
        />

        {multiFields && (
          <>
            <EuiSpacer size="m" />
            <MultiFields
              multiFields={multiFields}
              alwaysShowActionButton={alwaysShowActionButton}
              toggleDisplay={toggleDisplay}
            />
          </>
        )}

        <FieldPopoverFooter
          field={field}
          dataView={dataView}
          multiFields={rawMultiFields}
          trackUiMetric={trackUiMetric}
          contextualFields={contextualFields}
          originatingApp={PLUGIN_ID}
          uiActions={getUiActions()}
          closePopover={() => closePopover()}
        />
      </>
    );
  };

  const value = useMemo(
    () => ({
      id: field.name,
      humanData: {
        label: field.displayName,
        position: itemIndex + 1,
      },
    }),
    [field, itemIndex]
  );
  const order = useMemo(() => [0, groupIndex, itemIndex], [groupIndex, itemIndex]);

  return (
    <FieldPopover
      isOpen={infoIsOpen}
      button={
        <DragDrop
          draggable
          order={order}
          value={value}
          onDragStart={closePopover}
          isDisabled={alwaysShowActionButton}
          dataTestSubj={`dscFieldListPanelField-${field.name}`}
        >
          <FieldItemButton
            size="xs"
            fieldSearchHighlight={highlight}
            className="dscSidebarItem"
            isEmpty={isEmpty}
            isActive={infoIsOpen}
            flush={alwaysShowActionButton ? 'both' : undefined}
            shouldAlwaysShowAction={alwaysShowActionButton}
            onClick={field.type !== '_source' ? togglePopover : undefined}
            {...getCommonFieldItemButtonProps({ field, isSelected, toggleDisplay })}
          />
        </DragDrop>
      }
      closePopover={closePopover}
      data-test-subj="discoverFieldListPanelPopover"
      renderHeader={() => (
        <FieldPopoverHeader
          field={field}
          closePopover={closePopover}
          onAddFieldToWorkspace={!isSelected ? toggleDisplay : undefined}
          onAddFilter={onAddFilter}
          onEditField={onEditField}
          onDeleteField={onDeleteField}
          {...customPopoverHeaderProps}
        />
      )}
      renderContent={isDocumentRecord ? renderPopover : undefined}
    />
  );
}

export const DiscoverField = memo(DiscoverFieldComponent);
