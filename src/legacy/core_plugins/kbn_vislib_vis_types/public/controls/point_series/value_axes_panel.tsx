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

import React, { useCallback } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { VisOptionsProps } from 'ui/vis/editors/default';
import { BasicVislibParams, ValueAxis } from '../../types';
import { ValueAxisOptions } from './components/value_axis_options';
import { SetValueAxisByIndex } from '../../editors/metrics_axes_options';

interface ValueAxesPanelProps extends VisOptionsProps<BasicVislibParams> {
  isCategoryAxisHorizontal: boolean;
  getUpdatedAxisName: (axisPosition: ValueAxis['position']) => string;
  addValueAxis: () => ValueAxis;
  removeValueAxis: (axis: ValueAxis) => void;
  setValueAxisByIndex: SetValueAxisByIndex;
}

function ValueAxesPanel(props: ValueAxesPanelProps) {
  const { stateParams, addValueAxis, removeValueAxis } = props;

  const getSeries = useCallback(
    (axis: ValueAxis) => {
      const isFirst = stateParams.valueAxes[0] === axis;
      const series = stateParams.seriesParams.filter(
        serie => serie.valueAxis === axis.id || (isFirst && !serie.valueAxis)
      );
      return series.map(serie => serie.data.label).join(', ');
    },
    [stateParams.valueAxes, stateParams.seriesParams]
  );

  const renderRemoveButton = useCallback(
    (axis: ValueAxis) => (
      <EuiToolTip
        position="bottom"
        content={i18n.translate(
          'kbnVislibVisTypes.controls.pointSeries.valueAxes.removeButtonAriaLabel',
          {
            defaultMessage: 'Remove Y axis',
          }
        )}
      >
        <EuiButtonIcon
          color="danger"
          iconType="cross"
          onClick={() => removeValueAxis(axis)}
          aria-label={i18n.translate(
            'kbnVislibVisTypes.controls.pointSeries.valueAxes.removeButtonAriaLabel',
            {
              defaultMessage: 'Remove Y axis',
            }
          )}
        />
      </EuiToolTip>
    ),
    [removeValueAxis]
  );

  const getButtonContent = useCallback(
    (axis: ValueAxis) => {
      const description = getSeries(axis);

      return (
        <>
          {axis.name}{' '}
          <EuiToolTip content={description}>
            <>{description}</>
          </EuiToolTip>
        </>
      );
    },
    [getSeries]
  );
  return (
    <EuiPanel paddingSize="s">
      <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" alignItems="baseline">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              <FormattedMessage
                id="kbnVislibVisTypes.controls.pointSeries.valueAxes.yAxisTitle"
                defaultMessage="Y-Axes"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            position="bottom"
            content={i18n.translate(
              'kbnVislibVisTypes.controls.pointSeries.valueAxes.addButtonAriaLabel',
              {
                defaultMessage: 'Add Y axis',
              }
            )}
          >
            <EuiButtonIcon
              iconType="plusInCircleFilled"
              onClick={addValueAxis}
              aria-label={i18n.translate(
                'kbnVislibVisTypes.controls.pointSeries.valueAxes.addButtonAriaLabel',
                {
                  defaultMessage: 'Add Y axis',
                }
              )}
              data-test-subj="visualizeAddYAxisButton"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      {stateParams.valueAxes.map((axis, index) => (
        <EuiAccordion
          id="yAxisOptionsAccordion"
          key={axis.id}
          data-test-subj={`toggleYAxisOptions-${axis.id}`}
          className="visEditorSidebar__section visEditorSidebar__collapsible"
          initialIsOpen={false}
          buttonContent={getButtonContent(axis)}
          buttonClassName="eui-textTruncate"
          buttonContentClassName="visEditorSidebar__aggGroupAccordionButtonContent eui-textTruncate"
          aria-label={i18n.translate(
            'kbnVislibVisTypes.controls.pointSeries.valueAxes.toggleOptionsAriaLabel',
            {
              defaultMessage: 'Toggle {axisName} options',
              values: { axisName: axis.name },
            }
          )}
          extraAction={stateParams.valueAxes.length === 1 ? undefined : renderRemoveButton(axis)}
        >
          <>
            <EuiSpacer size="m" />
            <ValueAxisOptions axis={axis} index={index} {...props} />
          </>
        </EuiAccordion>
      ))}
    </EuiPanel>
  );
}

export { ValueAxesPanel };
