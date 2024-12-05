/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './index.scss';
import { isFieldLensCompatible } from '@kbn/visualization-ui-components';
import React, { useCallback, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSwitch, EuiSwitchEvent, EuiButtonGroup, EuiSpacer } from '@elastic/eui';
import {
  IconSelectSetting,
  DimensionEditorSection,
  NameInput,
  ColorPicker,
  LineStyleSettings,
  TextDecorationSetting,
  FieldPicker,
  FieldOption,
  type QueryInputServices,
} from '@kbn/visualization-ui-components';
import type { FieldOptionValue } from '@kbn/visualization-ui-components';
import { DataView } from '@kbn/data-views-plugin/common';
import { useExistingFieldsReader } from '@kbn/unified-field-list/src/hooks/use_existing_fields';
import moment from 'moment';
import { htmlIdGenerator } from '@elastic/eui';
import type {
  AvailableAnnotationIcon,
  EventAnnotationConfig,
  PointInTimeEventAnnotationConfig,
  QueryPointEventAnnotationConfig,
} from '@kbn/event-annotation-common';
import { isQueryAnnotationConfig, isRangeAnnotationConfig } from '../..';
import {
  defaultAnnotationColor,
  defaultAnnotationLabel,
  defaultAnnotationRangeColor,
  defaultRangeAnnotationLabel,
  toLineAnnotationColor,
} from './helpers';
import { annotationsIconSet } from './icon_set';
import { sanitizeProperties } from './helpers';
import { TooltipSection } from './tooltip_annotation_panel';
import { ConfigPanelManualAnnotation } from './manual_annotation_panel';
import { ConfigPanelQueryAnnotation } from './query_annotation_panel';

export interface Props {
  annotation: EventAnnotationConfig;
  onAnnotationChange: (annotation: EventAnnotationConfig) => void;
  dataView: DataView;
  getDefaultRangeEnd: (rangeStart: string) => string;
  calendarClassName?: string;
  queryInputServices: QueryInputServices;
  appName: string;
}

export const idPrefix = htmlIdGenerator()();

const AnnotationEditorControls = ({
  annotation: currentAnnotation,
  onAnnotationChange,
  dataView,
  getDefaultRangeEnd,
  calendarClassName,
  queryInputServices,
  appName,
}: Props) => {
  const { hasFieldData } = useExistingFieldsReader();

  const isQueryBased = isQueryAnnotationConfig(currentAnnotation);
  const isRange = isRangeAnnotationConfig(currentAnnotation);

  const [queryInputShouldOpen, setQueryInputShouldOpen] = React.useState(false);
  useEffect(() => {
    setQueryInputShouldOpen(!isQueryBased);
  }, [isQueryBased]);

  const update = useCallback(
    <T extends EventAnnotationConfig>(newAnnotation: Partial<T> | undefined) => {
      if (!newAnnotation) return;

      onAnnotationChange(sanitizeProperties({ ...currentAnnotation, ...newAnnotation }));
    },
    [currentAnnotation, onAnnotationChange]
  );

  const currentLineConfig = useMemo(() => {
    if (isRange) {
      return;
    }
    return {
      lineStyle: currentAnnotation.lineStyle,
      lineWidth: currentAnnotation.lineWidth,
    };
  }, [currentAnnotation, isRange]);

  return (
    <>
      <DimensionEditorSection
        title={i18n.translate('eventAnnotationComponents.xyChart.placement', {
          defaultMessage: 'Placement',
        })}
      >
        <EuiFormRow
          label={i18n.translate('eventAnnotationComponents.xyChart.annotationDate.placementType', {
            defaultMessage: 'Placement type',
          })}
          display="rowCompressed"
          fullWidth
        >
          <EuiButtonGroup
            legend={i18n.translate(
              'eventAnnotationComponents.xyChart.annotationDate.placementType',
              {
                defaultMessage: 'Placement type',
              }
            )}
            data-test-subj="lns-xyAnnotation-placementType"
            name="placementType"
            buttonSize="compressed"
            options={[
              {
                id: `lens_xyChart_annotation_manual`,
                label: i18n.translate('eventAnnotationComponents.xyChart.annotation.manual', {
                  defaultMessage: 'Static date',
                }),
                'data-test-subj': 'lnsXY_annotation_manual',
              },
              {
                id: `lens_xyChart_annotation_query`,
                label: i18n.translate('eventAnnotationComponents.xyChart.annotation.query', {
                  defaultMessage: 'Custom query',
                }),
                'data-test-subj': 'lnsXY_annotation_query',
              },
            ]}
            idSelected={`lens_xyChart_annotation_${currentAnnotation?.type}`}
            onChange={(id) => {
              const typeFromId = id.replace(
                'lens_xyChart_annotation_',
                ''
              ) as EventAnnotationConfig['type'];
              if (currentAnnotation?.type === typeFromId) {
                return;
              }
              if (typeFromId === 'query') {
                // If coming from a range type, it requires some additional resets
                const additionalRangeResets = isRangeAnnotationConfig(currentAnnotation)
                  ? {
                      label:
                        currentAnnotation.label === defaultRangeAnnotationLabel
                          ? defaultAnnotationLabel
                          : currentAnnotation.label,
                      color: toLineAnnotationColor(currentAnnotation.color),
                    }
                  : {};
                return update({
                  type: typeFromId,
                  timeField:
                    (dataView.timeFieldName ||
                      // fallback to the first avaiable date field in the dataView
                      dataView.fields
                        .filter(isFieldLensCompatible)
                        .find(({ type: fieldType }) => fieldType === 'date')?.displayName) ??
                    '',
                  key: { type: 'point_in_time' },
                  ...additionalRangeResets,
                });
              }
              // From query to manual annotation
              return update<PointInTimeEventAnnotationConfig>({
                type: typeFromId,
                key: { type: 'point_in_time', timestamp: moment().toISOString() },
              });
            }}
            isFullWidth
          />
        </EuiFormRow>
        {isQueryBased ? (
          <ConfigPanelQueryAnnotation
            annotation={currentAnnotation}
            onChange={update}
            dataView={dataView}
            queryInputShouldOpen={queryInputShouldOpen}
            queryInputServices={queryInputServices}
            appName={appName}
          />
        ) : (
          <ConfigPanelManualAnnotation
            annotation={currentAnnotation}
            onChange={update}
            getDefaultRangeEnd={getDefaultRangeEnd}
            calendarClassName={calendarClassName}
          />
        )}
      </DimensionEditorSection>
      <DimensionEditorSection
        title={i18n.translate('eventAnnotationComponents.xyChart.appearance', {
          defaultMessage: 'Appearance',
        })}
      >
        <NameInput
          value={currentAnnotation?.label || defaultAnnotationLabel}
          defaultValue={defaultAnnotationLabel}
          onChange={(value) => {
            update({ label: value });
          }}
        />
        {!isRange && (
          <>
            <IconSelectSetting<AvailableAnnotationIcon>
              currentIcon={currentAnnotation.icon}
              setIcon={(icon) => update({ icon })}
              defaultIcon="triangle"
              customIconSet={annotationsIconSet}
            />
            <TextDecorationSetting
              idPrefix={idPrefix}
              setConfig={update}
              currentConfig={currentAnnotation}
              isQueryBased={isQueryBased}
            >
              {(textDecorationSelected) => {
                if (textDecorationSelected !== 'field') {
                  return null;
                }
                const options = dataView.fields
                  .filter(isFieldLensCompatible)
                  .filter(({ displayName, type }) => displayName && type !== 'document')
                  .map(
                    (field) =>
                      ({
                        label: field.displayName,
                        value: {
                          type: 'field',
                          field: field.name,
                          dataType: field.type,
                        },
                        exists: hasFieldData(dataView.id!, field.name),
                        compatible: true,
                        'data-test-subj': `lnsXY-annotation-fieldOption-${field.name}`,
                      } as FieldOption<FieldOptionValue>)
                  );
                const selectedField = (currentAnnotation as QueryPointEventAnnotationConfig)
                  .textField;

                const fieldIsValid = selectedField
                  ? Boolean(dataView.getFieldByName(selectedField))
                  : true;

                return (
                  <>
                    <EuiSpacer size="xs" />
                    <FieldPicker
                      activeField={
                        selectedField
                          ? {
                              label: selectedField,
                              value: { type: 'field', field: selectedField },
                            }
                          : undefined
                      }
                      options={options}
                      onChoose={function (choice: FieldOptionValue | undefined): void {
                        if (choice) {
                          update({ textField: choice.field, textVisibility: true });
                        }
                      }}
                      fieldIsInvalid={!fieldIsValid}
                      data-test-subj="lnsXY-annotation-query-based-text-decoration-field-picker"
                      autoFocus={!selectedField}
                    />
                  </>
                );
              }}
            </TextDecorationSetting>
            <LineStyleSettings
              idPrefix={idPrefix}
              setConfig={update}
              currentConfig={currentLineConfig}
            />
          </>
        )}
        {isRange && (
          <EuiFormRow
            label={i18n.translate('eventAnnotationComponents.xyChart.fillStyle', {
              defaultMessage: 'Fill',
            })}
            display="columnCompressed"
            fullWidth
          >
            <EuiButtonGroup
              legend={i18n.translate('eventAnnotationComponents.xyChart.fillStyle', {
                defaultMessage: 'Fill',
              })}
              data-test-subj="lns-xyAnnotation-fillStyle"
              name="fillStyle"
              buttonSize="compressed"
              options={[
                {
                  id: `lens_xyChart_fillStyle_inside`,
                  label: i18n.translate('eventAnnotationComponents.xyChart.fillStyle.inside', {
                    defaultMessage: 'Inside',
                  }),
                  'data-test-subj': 'lnsXY_fillStyle_inside',
                },
                {
                  id: `lens_xyChart_fillStyle_outside`,
                  label: i18n.translate('eventAnnotationComponents.xyChart.fillStyle.outside', {
                    defaultMessage: 'Outside',
                  }),
                  'data-test-subj': 'lnsXY_fillStyle_inside',
                },
              ]}
              idSelected={`lens_xyChart_fillStyle_${
                Boolean(currentAnnotation?.outside) ? 'outside' : 'inside'
              }`}
              onChange={(id) => {
                update({
                  outside: id === `lens_xyChart_fillStyle_outside`,
                });
              }}
              isFullWidth
            />
          </EuiFormRow>
        )}

        <ColorPicker
          overwriteColor={currentAnnotation.color}
          isClearable={false}
          defaultColor={isRange ? defaultAnnotationRangeColor : defaultAnnotationColor}
          showAlpha={isRange}
          setConfig={update}
          disableHelpTooltip
          label={i18n.translate('eventAnnotationComponents.xyChart.lineColor.label', {
            defaultMessage: 'Color',
          })}
        />
        <ConfigPanelGenericSwitch
          label={i18n.translate('eventAnnotationComponents.xyChart.annotation.hide', {
            defaultMessage: 'Hide annotation',
          })}
          data-test-subj="lns-annotations-hide-annotation"
          value={Boolean(currentAnnotation.isHidden)}
          onChange={(ev) => update({ isHidden: ev.target.checked })}
        />
      </DimensionEditorSection>
      {isQueryBased && currentAnnotation && (
        <DimensionEditorSection
          title={i18n.translate('eventAnnotationComponents.xyChart.tooltip', {
            defaultMessage: 'Tooltip',
          })}
        >
          <EuiFormRow
            display="rowCompressed"
            className="lnsRowCompressedMargin"
            fullWidth
            label={i18n.translate('eventAnnotationComponents.xyChart.annotation.tooltip', {
              defaultMessage: 'Show additional fields',
            })}
          >
            <TooltipSection
              currentConfig={currentAnnotation}
              setConfig={update}
              dataView={dataView}
            />
          </EuiFormRow>
        </DimensionEditorSection>
      )}
    </>
  );
};

const ConfigPanelGenericSwitch = ({
  label,
  ['data-test-subj']: dataTestSubj,
  value,
  onChange,
}: {
  label: string;
  'data-test-subj': string;
  value: boolean;
  onChange: (event: EuiSwitchEvent) => void;
}) => (
  <EuiFormRow label={label} display="columnCompressed" fullWidth>
    <EuiSwitch
      compressed
      label={label}
      showLabel={false}
      data-test-subj={dataTestSubj}
      checked={value}
      onChange={onChange}
    />
  </EuiFormRow>
);

// eslint-disable-next-line import/no-default-export
export default AnnotationEditorControls;
