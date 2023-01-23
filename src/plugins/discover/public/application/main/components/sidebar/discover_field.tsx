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
  EuiButtonIcon,
  EuiToolTip,
  EuiTitle,
  EuiIcon,
  EuiSpacer,
  EuiHighlight,
  // EuiPanel,
  // EuiFlexGroup,
  // EuiFlexItem,
} from '@elastic/eui';
import { DraggableProvided } from 'react-beautiful-dnd';
import { i18n } from '@kbn/i18n';
import { UiCounterMetricType } from '@kbn/analytics';
import classNames from 'classnames';
import { FieldButton } from '@kbn/react-field';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/public';
import {
  FieldIcon,
  FieldPopover,
  FieldPopoverHeader,
  FieldPopoverHeaderProps,
  FieldPopoverVisualize,
  getFieldIconProps,
  wrapFieldNameOnDot,
} from '@kbn/unified-field-list-plugin/public';
import { DiscoverFieldStats } from './discover_field_stats';
import { DiscoverFieldDetails } from './deprecated_stats/discover_field_details';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { SHOW_LEGACY_FIELD_TOP_VALUES, PLUGIN_ID } from '../../../../../common';
import { getUiActions } from '../../../../kibana_services';
import { type DataDocuments$ } from '../../services/discover_data_state_container';

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
  return <FieldIcon {...getFieldIconProps(field)} />;
});

const FieldName: React.FC<{
  field: DataViewField;
  highlight?: string;
}> = memo(({ field, highlight }) => {
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
    <EuiHighlight
      search={wrapFieldNameOnDot(highlight)}
      data-test-subj={`field-${field.name}`}
      title={title}
      className="dscSidebarField__name"
    >
      {wrapFieldNameOnDot(field.displayName)}
    </EuiHighlight>
  );
});

interface ActionButtonProps {
  field: DataViewField;
  isSelected?: boolean;
  alwaysShow: boolean;
  toggleDisplay: (field: DataViewField, isSelected?: boolean) => void;
  provided: DraggableProvided;
}

const ActionButton: React.FC<ActionButtonProps> = memo(
  ({ field, isSelected, alwaysShow, toggleDisplay, provided }) => {
    const actionBtnClassName = classNames('dscSidebarItem__action', {
      ['dscSidebarItem__mobile']: alwaysShow,
    });
    if (field.name === '_source') {
      return null;
    }
    const tableAction = !isSelected ? (
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
    ) : (
      <EuiToolTip
        key={`tooltip-${field.name}-${field.count || 0}-${isSelected}`}
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
          aria-label={i18n.translate('discover.fieldChooser.discoverField.removeButtonAriaLabel', {
            defaultMessage: 'Remove {field} from table',
            values: { field: field.name },
          })}
        />
      </EuiToolTip>
    );

    return tableAction;

    // return (
    //   <EuiFlexGroup direction="row" responsive={false} gutterSize="s" alignItems="center">
    //     <EuiFlexItem grow={false}>{tableAction}</EuiFlexItem>
    //     <EuiFlexItem grow={false}>
    //       <EuiPanel
    //         color="transparent"
    //         paddingSize="s"
    //         {...provided.dragHandleProps}
    //         aria-label="Drag Handle"
    //       >
    //         <EuiIcon type="grab" />
    //       </EuiPanel>
    //     </EuiFlexItem>
    //   </EuiFlexGroup>
    // );
  }
);

interface MultiFieldsProps {
  multiFields: NonNullable<DiscoverFieldProps['multiFields']>;
  toggleDisplay: (field: DataViewField) => void;
  alwaysShowActionButton: boolean;
  provided: DraggableProvided;
}

const MultiFields: React.FC<MultiFieldsProps> = memo(
  ({ multiFields, toggleDisplay, alwaysShowActionButton, provided }) => (
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
              provided={provided}
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
   * hits fetched from ES, displayed in the doc table
   */
  documents$: DataDocuments$;
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

  /**
   * Search by field name
   */
  highlight?: string;

  provided: DraggableProvided;
}

function DiscoverFieldComponent({
  documents$,
  alwaysShowActionButton = false,
  field,
  highlight,
  dataView,
  onAddField,
  onRemoveField,
  onAddFilter,
  selected,
  trackUiMetric,
  multiFields,
  onEditField,
  onDeleteField,
  showFieldStats,
  contextualFields,
  provided,
}: DiscoverFieldProps) {
  const services = useDiscoverServices();
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
        fieldIcon={<DiscoverFieldTypeIcon field={field} />}
        fieldAction={
          <ActionButton
            field={field}
            isSelected={selected}
            alwaysShow={alwaysShowActionButton}
            toggleDisplay={toggleDisplay}
            provided={provided}
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
      onClick={isDocumentRecord ? togglePopover : undefined}
      dataTestSubj={`field-${field.name}-showDetails`}
      fieldIcon={<DiscoverFieldTypeIcon field={field} />}
      fieldAction={
        <ActionButton
          field={field}
          isSelected={selected}
          alwaysShow={alwaysShowActionButton}
          toggleDisplay={toggleDisplay}
          provided={provided}
        />
      }
      fieldName={<FieldName field={field} highlight={highlight} />}
      fieldInfoIcon={field.type === 'conflict' && <FieldInfoIcon />}
    />
  );

  if (!isDocumentRecord) {
    return button;
  }

  const renderPopover = () => {
    const showLegacyFieldStats = services.uiSettings.get(SHOW_LEGACY_FIELD_TOP_VALUES);

    return (
      <>
        {showLegacyFieldStats ? ( // TODO: Deprecate and remove after ~v8.7
          <>
            {showFieldStats && (
              <DiscoverFieldDetails
                documents$={documents$}
                dataView={dataView}
                field={field}
                onAddFilter={onAddFilter}
              />
            )}
          </>
        ) : (
          <DiscoverFieldStats
            field={field}
            multiFields={multiFields}
            dataView={dataView}
            onAddFilter={addFilterAndClosePopover}
          />
        )}

        {multiFields && (
          <>
            {(showFieldStats || !showLegacyFieldStats) && <EuiSpacer size="m" />}
            <MultiFields
              multiFields={multiFields}
              alwaysShowActionButton={alwaysShowActionButton}
              toggleDisplay={toggleDisplay}
              provided={provided}
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
