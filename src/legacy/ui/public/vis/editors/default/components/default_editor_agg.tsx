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

import React, { useState } from 'react';
import { findIndex, reduce } from 'lodash';
import {
  EuiAccordion,
  EuiToolTip,
  EuiButtonIcon,
  EuiText,
  EuiTextColor,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { AggType } from 'ui/agg_types';
import { AggConfig, Vis, VisState, AggParams } from 'ui/vis';
import { DefaultEditorAggParams } from './default_editor_agg_params';

interface DefaultEditorAggProps {
  agg: AggConfig;
  aggIndex: number;
  aggIsTooLow: boolean;
  groupName: string;
  formIsTouched: boolean;
  isDraggable: boolean;
  isRemovable: boolean;
  isValid: boolean;
  responseValueAggs: AggConfig[] | null;
  state: VisState;
  vis: Vis;
  onAggParamsChange: (agg: AggParams, paramName: string, value: unknown) => void;
  onAggTypeChange: (agg: AggConfig, aggType: AggType) => void;
  onAggErrorChanged: (agg: AggConfig, error?: string) => void;
  onToggleEnableAgg: (agg: AggConfig, isEnable: boolean) => void;
  removeAgg: (agg: AggConfig) => void;
  setTouched: (isTouched: boolean) => void;
  setValidity: (isValid: boolean) => void;
}

function DefaultEditorAgg({
  agg,
  aggIndex,
  aggIsTooLow,
  groupName,
  formIsTouched,
  isDraggable,
  isRemovable,
  isValid,
  responseValueAggs,
  state,
  vis,
  onAggParamsChange,
  onAggTypeChange,
  setTouched,
  setValidity,
  onAggErrorChanged,
  onToggleEnableAgg,
  removeAgg,
}: DefaultEditorAggProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(agg.brandNew);
  const showDescription = !isEditorOpen && isValid;
  const showError = !isEditorOpen && !isValid;

  const SchemaComponent = agg.schema.editorComponent;

  const renderAggButtons = () => {
    const actionIcons = [];

    if (agg.enabled && isRemovable) {
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
    if (!agg.enabled) {
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
    if (isRemovable) {
      actionIcons.push({
        id: 'removeDimension',
        color: 'danger',
        type: 'cross',
        onClick: () => removeAgg(agg),
        ariaLabel: i18n.translate('common.ui.vis.editors.agg.removeDimensionButtonAriaLabel', {
          defaultMessage: 'Remove dimension',
        }),
        tooltip: i18n.translate('common.ui.vis.editors.agg.removeDimensionButtonTooltip', {
          defaultMessage: 'Remove dimension',
        }),
        dataTestSubj: 'removeDimensionBtn',
      });
    }
    return (
      <div>
        {actionIcons.map(icon => (
          <EuiToolTip key={icon.id} position="bottom" content={icon.tooltip}>
            <EuiButtonIcon
              iconType={icon.type}
              color={icon.color}
              onClick={icon.onClick}
              aria-label={icon.ariaLabel}
              data-test-subj={icon.dataTestSubj}
            />
          </EuiToolTip>
        ))}
      </div>
    );
  };

  /**
   * Describe the aggregation, for display in the collapsed agg header
   * @return {[type]} [description]
   */
  const describe = () => {
    if (!agg.type || !agg.type.makeLabel) {
      return '';
    }
    return agg.type.makeLabel(agg) || '';
  };

  // $scope.$watch('editorOpen', function(open) {
  //   // make sure that all of the form inputs are "touched"
  //   // so that their errors propagate
  //   if (!open) kbnForm.$setTouched();
  // });

  const buttonContent = (
    <div>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <p className="euiAccordionForm__title">{agg.schema.title}</p>
        </EuiFlexItem>

        <EuiFlexItem>
          {showDescription && (
            <EuiText size="s">
              <p>
                <EuiTextColor color="subdued">{describe()}</EuiTextColor>
              </p>
            </EuiText>
          )}

          {showError && (
            <EuiTextColor color="danger">
              <h6>
                <FormattedMessage
                  id="common.ui.vis.editors.agg.errorsText"
                  defaultMessage="Errors"
                />
              </h6>
            </EuiTextColor>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );

  return (
    <>
      <EuiAccordion
        id={`visEditorAggAccordion${agg.id}`}
        initialIsOpen={isEditorOpen}
        buttonContent={buttonContent}
        className="visEditorSidebar__section visEditorSidebar__collapsible visEditorSidebar__collapsible--marginBottom"
        paddingSize="s"
        aria-label={i18n.translate('common.ui.vis.editors.agg.toggleEditorButtonAriaLabel', {
          defaultMessage: 'Toggle {schema} editor',
          values: { schema: agg.schema.title },
        })}
        data-test-subj="toggleEditor"
        extraAction={renderAggButtons()}
        onToggle={isOpen => setIsEditorOpen(isOpen)}
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
            aggIndex={aggIndex}
            aggIsTooLow={aggIsTooLow}
            groupName={groupName}
            formIsTouched={formIsTouched}
            indexPattern={vis.indexPattern}
            responseValueAggs={responseValueAggs}
            state={state}
            onAggParamsChange={onAggParamsChange}
            onAggTypeChange={onAggTypeChange}
            setTouched={setTouched}
            setValidity={setValidity}
            onAggErrorChanged={onAggErrorChanged}
          />
        </>
      </EuiAccordion>
    </>
  );
}

export { DefaultEditorAgg };
