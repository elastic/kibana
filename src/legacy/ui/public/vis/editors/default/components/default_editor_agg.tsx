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

import React from 'react';
import { EuiAccordion } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AggType } from 'ui/agg_types';
import { AggConfig, Vis, VisState, AggParams } from 'ui/vis';
import { DefaultEditorAggParams } from './default_editor_agg_params';
import { DefaultEditorAggAdd } from './default_editor_agg_add';

interface DefaultEditorAggProps {
  agg: AggConfig;
  aggIndex: number;
  group: AggConfig[];
  groupName: string;
  isDraggable: boolean;
  isAggEnabled: boolean;
  responseValueAggs: AggConfig[] | null;
  schemas: any;
  state: VisState;
  stats: any;
  vis: Vis;
  addSchema: () => {};
  onAggParamsChange: (agg: AggParams, paramName: string, value: unknown) => void;
  onAggTypeChange: (agg: AggConfig, aggType: AggType) => void;
  onAggErrorChanged: (agg: AggConfig, error?: string) => void;
  onToggleEnableAgg: (agg: AggConfig, isEnable: boolean) => void;
  onRemoveAgg: (agg: AggConfig) => void;
  setTouched: (isTouched: boolean) => void;
  setValidity: (isValid: boolean) => void;
}

function DefaultEditorAgg({
  agg,
  aggIndex,
  group,
  groupName,
  isDraggable,
  isAggEnabled,
  responseValueAggs,
  schemas,
  state,
  stats,
  vis,
  addSchema,
  onAggParamsChange,
  onAggTypeChange,
  setTouched,
  setValidity,
  onAggErrorChanged,
  onToggleEnableAgg,
  onRemoveAgg,
}: DefaultEditorAggProps) {
  function calcAggIsTooLow() {
    if (!agg.schema.mustBeFirst) {
      return false;
    }

    const firstDifferentSchema = _.findIndex(group, (aggr: AggConfig) => {
      return aggr.schema !== agg.schema;
    });

    if (firstDifferentSchema === -1) {
      return false;
    }

    return aggIndex > firstDifferentSchema;
  }
  const SchemaComponent = agg.schema.editorComponent;
  const showAggAdd = aggIndex + 1 === stats.count;

  const canRemove = () => {
    const metricCount = _.reduce(
      group,
      (count, aggregation) => {
        return aggregation.schema.name === agg.schema.name ? ++count : count;
      },
      0
    );

    // make sure the the number of these aggs is above the min
    return metricCount > agg.schema.min;
  };

  const renderAggButtons = () => {
    const actionIcons = [];
    const isAggRemovable = canRemove();

    if (isAggEnabled && isAggRemovable) {
      actionIcons.push({
        id: 'disableAggregation',
        color: 'text',
        type: 'eye',
        onClick: () => onToggleEnableAgg(agg, false),
        ariaLabel: i18n.translate('common.ui.vis.editors.agg.disableAggButtonAriaLabel', {
          defaultMessage: 'Disable aggregation',
        }),
        tooltip: i18n.translate('common.ui.vis.editors.agg.disableAggButtonTooltip', {
          defaultMessage: 'Disable aggregation',
        }),
        dataTestSubj: 'disableAggregationBtn',
      });
    }
    if (!isAggEnabled) {
      actionIcons.push({
        id: 'enableAggregation',
        color: 'text',
        type: 'eyeClosed',
        onClick: () => onToggleEnableAgg(agg, true),
        ariaLabel: i18n.translate('common.ui.vis.editors.agg.enableAggButtonAriaLabel', {
          defaultMessage: 'Enable aggregation',
        }),
        tooltip: i18n.translate('common.ui.vis.editors.agg.enableAggButtonTooltip', {
          defaultMessage: 'Enable aggregation',
        }),
        dataTestSubj: 'disableAggregationBtn',
      });
    }
    if (isDraggable) {
      // directive draggable-handle
      actionIcons.push({
        id: 'dragHandle',
        color: 'text',
        type: 'sortable',
        onClick: () => 'onPriorityReorder(direction)',
        ariaLabel: i18n.translate('common.ui.vis.editors.agg.modifyPriorityButtonAriaLabel', {
          defaultMessage:
            'Use up and down key on this button to move this aggregation up and down in the priority order.',
        }),
        tooltip: i18n.translate('common.ui.vis.editors.agg.modifyPriorityButtonTooltip', {
          defaultMessage: 'Modify priority by dragging',
        }),
        dataTestSubj: 'dragHandleBtn',
      });
    }
    if (isAggRemovable) {
      actionIcons.push({
        id: 'removeDimension',
        color: 'danger',
        type: 'cross',
        onClick: () => onRemoveAgg(agg),
        ariaLabel: i18n.translate('common.ui.vis.editors.agg.removeDimensionButtonAriaLabel', {
          defaultMessage: 'Remove dimension',
        }),
        tooltip: i18n.translate('common.ui.vis.editors.agg.removeDimensionButtonTooltip', {
          defaultMessage: 'Remove dimension',
        }),
        dataTestSubj: 'removeDimensionBtn',
      });
    }
    return null;
  };

  return (
    <EuiAccordion
      id={`visEditorAggAccordion${agg.id}`}
      initialIsOpen={agg.brandNew}
      buttonContent={agg.schema.title}
      paddingSize="none"
      aria-label={i18n.translate('common.ui.vis.editors.agg.toggleEditorButtonAriaLabel', {
        defaultMessage: 'Toggle {schema} editor',
        values: { schema: agg.schema.title },
      })}
      data-test-subj="toggleEditor"
      extraAction={renderAggButtons()}
    >
      <>
        {SchemaComponent && (
          <SchemaComponent
            aggParams={agg.params}
            editorStateParams={state.params}
            setValue={onAggParamsChange}
          />
        )}
        <DefaultEditorAggParams
          agg={agg}
          aggIndex={aggIndex}
          aggIsTooLow={calcAggIsTooLow()}
          groupName={groupName}
          indexPattern={vis.indexPattern}
          responseValueAggs={responseValueAggs}
          state={state}
          onAggParamsChange={onAggParamsChange}
          onAggTypeChange={onAggTypeChange}
          setTouched={setTouched}
          setValidity={setValidity}
          onAggErrorChanged={onAggErrorChanged}
        />
        {showAggAdd && (
          <DefaultEditorAggAdd
            group={group}
            groupName={groupName}
            schemas={schemas}
            stats={stats}
            addSchema={addSchema}
          />
        )}
      </>
    </EuiAccordion>
  );
}

export { DefaultEditorAgg };
