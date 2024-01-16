/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import fastIsEqual from 'fast-deep-equal';
import { getFieldIconType } from '@kbn/field-utils';
import { useExistingFieldsReader } from '@kbn/unified-field-list';
import {
  FieldOption,
  FieldOptionValue,
  FieldPicker,
  NewBucketButton,
  DragDropBuckets,
  DraggableBucketContainer,
  FieldsBucketContainer,
  isFieldLensCompatible,
} from '@kbn/visualization-ui-components';
import { DataView } from '@kbn/data-views-plugin/common';
import type { QueryPointEventAnnotationConfig } from '@kbn/event-annotation-common';

export const MAX_TOOLTIP_FIELDS_SIZE = 2;

const supportedTypes = new Set(['string', 'boolean', 'number', 'ip', 'date']);

export interface FieldInputsProps {
  currentConfig: QueryPointEventAnnotationConfig;
  setConfig: (config: QueryPointEventAnnotationConfig) => void;
  dataView: DataView;
  invalidFields?: string[];
}

function removeNewEmptyField(v: string) {
  return v !== '';
}

export function TooltipSection({ currentConfig, setConfig, dataView }: FieldInputsProps) {
  const { hasFieldData } = useExistingFieldsReader();

  // This is a local state that is not synced with the global state
  const [currentFields, _setFields] = useState<string[]>(currentConfig.extraFields ?? []);

  const setFields = useCallback(
    (fields: string[]) => {
      _setFields(fields);

      let newExtraFields: QueryPointEventAnnotationConfig['extraFields'] =
        fields.filter(removeNewEmptyField);
      newExtraFields = newExtraFields.length ? newExtraFields : undefined;

      if (!fastIsEqual(newExtraFields, currentConfig.extraFields)) {
        setConfig({
          ...currentConfig,
          extraFields: newExtraFields,
        });
      }
    },
    [setConfig, currentConfig]
  );

  const addFieldButton = (
    <NewBucketButton
      className="lnsConfigPanelAnnotations__addButton"
      data-test-subj={`lnsXY-annotation-tooltip-add_field`}
      onClick={() => {
        setFields([...currentFields, '']);
      }}
      label={i18n.translate('eventAnnotationComponents.xyChart.annotation.tooltip.addField', {
        defaultMessage: 'Add field',
      })}
      isDisabled={currentFields.length > MAX_TOOLTIP_FIELDS_SIZE}
    />
  );

  if (currentFields.length === 0) {
    return (
      <>
        <EuiFlexItem grow={true}>
          <EuiPanel
            color="subdued"
            paddingSize="s"
            className="lnsConfigPanelAnnotations__noFieldsPrompt"
          >
            <EuiText color="subdued" size="s" textAlign="center">
              {i18n.translate('eventAnnotationComponents.xyChart.annotation.tooltip.noFields', {
                defaultMessage: 'None selected',
              })}
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
        {addFieldButton}
      </>
    );
  }

  const options = dataView.fields
    .filter(isFieldLensCompatible)
    .filter(
      ({ displayName, type }) =>
        displayName && !currentConfig.extraFields?.includes(displayName) && supportedTypes.has(type)
    )
    .map(
      (field) =>
        ({
          label: field.displayName,
          value: {
            type: 'field',
            field: field.name,
            dataType: getFieldIconType(field),
          },
          exists: dataView.id ? hasFieldData(dataView.id, field.name) : false,
          compatible: true,
          'data-test-subj': `lnsXY-annotation-tooltip-fieldOption-${field.name}`,
        } as FieldOption<FieldOptionValue>)
    )
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <>
      <DragDropBuckets
        onDragEnd={(updatedFields: string[]) => {
          setFields(updatedFields);
        }}
        droppableId="ANNOTATION_TOOLTIP_DROPPABLE_AREA"
        items={currentFields}
        bgColor="subdued"
      >
        {currentFields.map((field, index, arrayRef) => {
          const fieldIsValid = field === '' ? true : Boolean(dataView.getFieldByName(field));

          return (
            <DraggableBucketContainer
              id={field === '' ? 'newField' : field}
              key={field === '' ? 'newField' : field}
              idx={index}
              onRemoveClick={() => {
                setFields(arrayRef.filter((_, i) => i !== index));
              }}
              removeTitle={i18n.translate(
                'eventAnnotationComponents.xyChart.annotation.tooltip.deleteButtonLabel',
                {
                  defaultMessage: 'Delete',
                }
              )}
              isNotDraggable={arrayRef.length < 2}
              Container={FieldsBucketContainer}
              isInsidePanel={true}
              data-test-subj={`lnsXY-annotation-tooltip-${index}`}
            >
              <FieldPicker
                compressed
                selectedOptions={
                  field
                    ? [
                        {
                          label: field,
                          value: { type: 'field', field },
                        },
                      ]
                    : []
                }
                options={options}
                onChoose={(choice) => {
                  if (!choice) {
                    return;
                  }

                  if (dataView.getFieldByName(choice.field)) {
                    const newFields = [...currentFields];
                    newFields[index] = choice.field;
                    setFields(newFields);
                  }
                }}
                fieldIsInvalid={!fieldIsValid}
                className="lnsConfigPanelAnnotations__fieldPicker"
                data-test-subj={`lnsXY-annotation-tooltip-field-picker--${index}`}
                autoFocus={field === ''}
              />
            </DraggableBucketContainer>
          );
        })}
      </DragDropBuckets>
      {addFieldButton}
    </>
  );
}
