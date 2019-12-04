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

import React, { useState, useEffect } from 'react';
import {
  EuiAccordion,
  EuiToolTip,
  EuiButtonIcon,
  EuiButtonIconProps,
  EuiSpacer,
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AggConfig } from '../../..';
import { DefaultEditorAggParams } from './agg_params';
import { DefaultEditorAggCommonProps } from './agg_common_props';

export interface DefaultEditorAggProps extends DefaultEditorAggCommonProps {
  agg: AggConfig;
  aggIndex: number;
  aggIsTooLow: boolean;
  dragHandleProps: {} | null;
  isDisabled: boolean;
  isDraggable: boolean;
  isLastBucket: boolean;
  isRemovable: boolean;
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
  onAggParamsChange,
  onAggTypeChange,
  onToggleEnableAgg,
  removeAgg,
  setTouched,
  setValidity,
}: DefaultEditorAggProps) {
  const [isEditorOpen, setIsEditorOpen] = useState((agg as any).brandNew);
  const [validState, setValidState] = useState(true);
  const showDescription = !isEditorOpen && validState;
  const showError = !isEditorOpen && !validState;
  let disabledParams;
  let aggError;
  // When a Parent Pipeline agg is selected and this agg is the last bucket.
  const isLastBucketAgg = isLastBucket && lastParentPipelineAggTitle && agg.type;

  const SchemaComponent = agg.schema.editorComponent;

  if (isLastBucketAgg) {
    if (['date_histogram', 'histogram'].includes(agg.type.name)) {
      disabledParams = ['min_doc_count'];
    } else {
      aggError = i18n.translate('common.ui.aggTypes.metrics.wrongLastBucketTypeErrorMessage', {
        defaultMessage:
          'Last bucket aggregation must be "Date Histogram" or "Histogram" when using "{type}" metric aggregation.',
        values: { type: lastParentPipelineAggTitle },
        description: 'Date Histogram and Histogram should not be translated',
      });
    }
  }

  // A description of the aggregation, for displaying in the collapsed agg header
  let aggDescription = '';

  if (agg.type && agg.type.makeLabel) {
    try {
      aggDescription = agg.type.makeLabel(agg);
    } catch (e) {
      // Date Histogram's `makeLabel` implementation invokes 'write' method for each param, including interval's 'write',
      // which throws an error when interval is undefined.
      aggDescription = '';
    }
  }

  useEffect(() => {
    if (isLastBucketAgg && ['date_histogram', 'histogram'].includes(agg.type.name)) {
      onAggParamsChange(
        agg.params,
        'min_doc_count',
        // "histogram" agg has an editor for "min_doc_count" param, which accepts boolean
        // "date_histogram" agg doesn't have an editor for "min_doc_count" param, it should be set as a numeric value
        agg.type.name === 'histogram' ? true : 0
      );
    }
  }, [lastParentPipelineAggTitle, isLastBucket, agg.type]);

  const onToggle = (isOpen: boolean) => {
    setIsEditorOpen(isOpen);
    if (!isOpen) {
      setTouched(true);
    }
  };

  const onSetValidity = (isValid: boolean) => {
    setValidity(isValid);
    setValidState(isValid);
  };

  const renderAggButtons = () => {
    const actionIcons = [];

    if (showError) {
      actionIcons.push({
        id: 'hasErrors',
        color: 'danger',
        type: 'alert',
        tooltip: i18n.translate('common.ui.vis.editors.agg.errorsAriaLabel', {
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
        onClick: () => onToggleEnableAgg(agg, false),
        tooltip: i18n.translate('common.ui.vis.editors.agg.disableAggButtonTooltip', {
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
        onClick: () => onToggleEnableAgg(agg, true),
        tooltip: i18n.translate('common.ui.vis.editors.agg.enableAggButtonTooltip', {
          defaultMessage: 'Enable aggregation',
        }),
        dataTestSubj: 'toggleDisableAggregationBtn enable',
      });
    }
    if (isDraggable) {
      actionIcons.push({
        id: 'dragHandle',
        type: 'grab',
        tooltip: i18n.translate('common.ui.vis.editors.agg.modifyPriorityButtonTooltip', {
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
        onClick: () => removeAgg(agg),
        tooltip: i18n.translate('common.ui.vis.editors.agg.removeDimensionButtonTooltip', {
          defaultMessage: 'Remove dimension',
        }),
        dataTestSubj: 'removeDimensionBtn',
      });
    }
    return (
      <div {...dragHandleProps}>
        {actionIcons.map(icon => {
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

  const buttonContent = (
    <>
      {agg.schema.title} {showDescription && <span>{aggDescription}</span>}
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
      aria-label={i18n.translate('common.ui.vis.editors.agg.toggleEditorButtonAriaLabel', {
        defaultMessage: 'Toggle {schema} editor',
        values: { schema: agg.schema.title },
      })}
      data-test-subj={`visEditorAggAccordion${agg.id}`}
      extraAction={renderAggButtons()}
      onToggle={onToggle}
    >
      <>
        <EuiSpacer size="m" />
        {SchemaComponent && (
          <SchemaComponent
            aggParams={agg.params}
            editorStateParams={state.params}
            setValue={onAggParamsChange}
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
          onAggParamsChange={onAggParamsChange}
          onAggTypeChange={onAggTypeChange}
          setTouched={setTouched}
          setValidity={onSetValidity}
        />
      </>
    </EuiAccordion>
  );
}

export { DefaultEditorAgg };
