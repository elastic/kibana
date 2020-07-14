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

import React, { useState, useEffect, useCallback } from 'react';
import {
  EuiAccordion,
  EuiToolTip,
  EuiButtonIcon,
  EuiButtonIconProps,
  EuiSpacer,
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { IAggConfig, TimeRange } from 'src/plugins/data/public';
import { DefaultEditorAggParams } from './agg_params';
import { DefaultEditorAggCommonProps } from './agg_common_props';
import { AGGS_ACTION_KEYS, AggsAction } from './agg_group_state';
import { RowsOrColumnsControl } from './controls/rows_or_columns';
import { RadiusRatioOptionControl } from './controls/radius_ratio_option';
import { getSchemaByName } from '../schemas';
import { buildAggDescription } from './agg_params_helper';

export interface DefaultEditorAggProps extends DefaultEditorAggCommonProps {
  agg: IAggConfig;
  aggIndex: number;
  aggIsTooLow: boolean;
  dragHandleProps: {} | null;
  isDisabled: boolean;
  isDraggable: boolean;
  isLastBucket: boolean;
  isRemovable: boolean;
  setAggsState: React.Dispatch<AggsAction>;
  timeRange?: TimeRange;
}

function DefaultEditorAgg({
  agg,
  aggIndex,
  aggIsTooLow,
  dragHandleProps,
  formIsTouched,
  groupName,
  isDisabled,
  isDraggable,
  isLastBucket,
  isRemovable,
  metricAggs,
  lastParentPipelineAggTitle,
  state,
  setAggParamValue,
  setStateParamValue,
  onAggTypeChange,
  onToggleEnableAgg,
  removeAgg,
  setAggsState,
  schemas,
  timeRange,
}: DefaultEditorAggProps) {
  const [isEditorOpen, setIsEditorOpen] = useState((agg as any).brandNew);
  const [validState, setValidState] = useState(true);
  const showDescription = !isEditorOpen && validState;
  const showError = !isEditorOpen && !validState;
  const aggName = agg.type?.name;
  let disabledParams;
  let aggError;
  // When a Parent Pipeline agg is selected and this agg is the last bucket.
  const isLastBucketAgg = isLastBucket && lastParentPipelineAggTitle && agg.type;

  let SchemaComponent;

  if (agg.schema === 'split') {
    SchemaComponent = RowsOrColumnsControl;
  }

  if (agg.schema === 'radius') {
    SchemaComponent = RadiusRatioOptionControl;
  }

  if (isLastBucketAgg) {
    if (['date_histogram', 'histogram'].includes(aggName)) {
      disabledParams = ['min_doc_count'];
    } else {
      aggError = i18n.translate('visDefaultEditor.metrics.wrongLastBucketTypeErrorMessage', {
        defaultMessage:
          'Last bucket aggregation must be "Date Histogram" or "Histogram" when using "{type}" metric aggregation.',
        values: { type: lastParentPipelineAggTitle },
        description: 'Date Histogram and Histogram should not be translated',
      });
    }
  }

  const [aggDescription, setAggDescription] = useState(buildAggDescription(agg));

  // This useEffect is required to update the timeRange value and initiate rerender to keep labels up to date (Issue #57822).
  useEffect(() => {
    if (timeRange && aggName === 'date_histogram') {
      agg.aggConfigs.setTimeRange(timeRange);
    }
    setAggDescription(buildAggDescription(agg));
  }, [agg, aggName, timeRange]);

  useEffect(() => {
    if (isLastBucketAgg && ['date_histogram', 'histogram'].includes(aggName)) {
      setAggParamValue(
        agg.id,
        'min_doc_count',
        // "histogram" agg has an editor for "min_doc_count" param, which accepts boolean
        // "date_histogram" agg doesn't have an editor for "min_doc_count" param, it should be set as a numeric value
        aggName === 'histogram' ? true : 0
      );
    }
  }, [aggName, isLastBucketAgg, agg.id, setAggParamValue]);

  const setTouched = useCallback(
    (touched: boolean) => {
      setAggsState({
        type: AGGS_ACTION_KEYS.TOUCHED,
        payload: touched,
        aggId: agg.id,
      });
    },
    [agg.id, setAggsState]
  );

  const setValidity = useCallback(
    (isValid: boolean) => {
      setAggsState({
        type: AGGS_ACTION_KEYS.VALID,
        payload: isValid,
        aggId: agg.id,
      });
      setValidState(isValid);
    },
    [agg.id, setAggsState]
  );

  const onToggle = useCallback(
    (isOpen: boolean) => {
      setIsEditorOpen(isOpen);
      if (!isOpen) {
        setTouched(true);
      }
    },
    [setTouched]
  );

  const renderAggButtons = () => {
    const actionIcons = [];

    if (showError) {
      actionIcons.push({
        id: 'hasErrors',
        color: 'danger',
        type: 'alert',
        tooltip: i18n.translate('visDefaultEditor.agg.errorsAriaLabel', {
          defaultMessage: 'Aggregation has errors',
        }),
        dataTestSubj: 'hasErrorsAggregationIcon',
      });
    }

    if (agg.enabled && isRemovable) {
      actionIcons.push({
        id: 'disableAggregation',
        color: 'text',
        disabled: isDisabled,
        type: 'eye',
        onClick: () => onToggleEnableAgg(agg.id, false),
        tooltip: i18n.translate('visDefaultEditor.agg.disableAggButtonTooltip', {
          defaultMessage: 'Disable aggregation',
        }),
        dataTestSubj: 'toggleDisableAggregationBtn disable',
      });
    }
    if (!agg.enabled) {
      actionIcons.push({
        id: 'enableAggregation',
        color: 'text',
        type: 'eyeClosed',
        onClick: () => onToggleEnableAgg(agg.id, true),
        tooltip: i18n.translate('visDefaultEditor.agg.enableAggButtonTooltip', {
          defaultMessage: 'Enable aggregation',
        }),
        dataTestSubj: 'toggleDisableAggregationBtn enable',
      });
    }
    if (isDraggable) {
      actionIcons.push({
        id: 'dragHandle',
        type: 'grab',
        tooltip: i18n.translate('visDefaultEditor.agg.modifyPriorityButtonTooltip', {
          defaultMessage: 'Modify priority by dragging',
        }),
        dataTestSubj: 'dragHandleBtn',
      });
    }
    if (isRemovable) {
      actionIcons.push({
        id: 'removeDimension',
        color: 'danger',
        type: 'cross',
        onClick: () => removeAgg(agg.id),
        tooltip: i18n.translate('visDefaultEditor.agg.removeDimensionButtonTooltip', {
          defaultMessage: 'Remove dimension',
        }),
        dataTestSubj: 'removeDimensionBtn',
      });
    }
    return (
      <div {...dragHandleProps}>
        {actionIcons.map((icon) => {
          if (icon.id === 'dragHandle') {
            return (
              <EuiIconTip
                key={icon.id}
                type={icon.type}
                content={icon.tooltip}
                iconProps={{
                  ['aria-label']: icon.tooltip,
                  ['data-test-subj']: icon.dataTestSubj,
                }}
                position="bottom"
              />
            );
          }

          return (
            <EuiToolTip key={icon.id} position="bottom" content={icon.tooltip}>
              <EuiButtonIcon
                disabled={icon.disabled}
                iconType={icon.type}
                color={icon.color as EuiButtonIconProps['color']}
                onClick={icon.onClick}
                aria-label={icon.tooltip}
                data-test-subj={icon.dataTestSubj}
              />
            </EuiToolTip>
          );
        })}
      </div>
    );
  };
  const schemaTitle = getSchemaByName(schemas, agg.schema).title;
  const buttonContent = (
    <>
      {schemaTitle || agg.schema} {showDescription && <span>{aggDescription}</span>}
    </>
  );

  return (
    <EuiAccordion
      id={`visEditorAggAccordion${agg.id}`}
      initialIsOpen={isEditorOpen}
      buttonContent={buttonContent}
      buttonClassName="eui-textTruncate"
      buttonContentClassName="visEditorSidebar__aggGroupAccordionButtonContent eui-textTruncate"
      className="visEditorSidebar__section visEditorSidebar__collapsible visEditorSidebar__collapsible--marginBottom"
      aria-label={i18n.translate('visDefaultEditor.agg.toggleEditorButtonAriaLabel', {
        defaultMessage: 'Toggle {schema} editor',
        values: { schema: schemaTitle || agg.schema },
      })}
      data-test-subj={`visEditorAggAccordion${agg.id}`}
      extraAction={renderAggButtons()}
      onToggle={onToggle}
    >
      <>
        <EuiSpacer size="m" />
        {SchemaComponent && (
          <SchemaComponent
            agg={agg}
            editorStateParams={state.params}
            setAggParamValue={setAggParamValue}
            setStateParamValue={setStateParamValue}
          />
        )}
        <DefaultEditorAggParams
          agg={agg}
          aggError={aggError}
          aggIndex={aggIndex}
          aggIsTooLow={aggIsTooLow}
          disabledParams={disabledParams}
          formIsTouched={formIsTouched}
          groupName={groupName}
          indexPattern={agg.getIndexPattern()}
          metricAggs={metricAggs}
          state={state}
          setAggParamValue={setAggParamValue}
          onAggTypeChange={onAggTypeChange}
          setTouched={setTouched}
          setValidity={setValidity}
          schemas={schemas}
        />
      </>
    </EuiAccordion>
  );
}

export { DefaultEditorAgg };
