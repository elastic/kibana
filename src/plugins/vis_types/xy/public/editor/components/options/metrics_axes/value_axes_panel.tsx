/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';
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
import { FormattedMessage } from '@kbn/i18n-react';

import { SeriesParam, ValueAxis } from '../../../../types';
import { ValueAxisOptions } from './value_axis_options';
import { SetParamByIndex } from '.';

export interface ValueAxesPanelProps {
  addValueAxis: () => ValueAxis;
  removeValueAxis: (axis: ValueAxis) => void;
  onValueAxisPositionChanged: (index: number, value: ValueAxis['position']) => void;
  setParamByIndex: SetParamByIndex;
  seriesParams: SeriesParam[];
  valueAxes: ValueAxis[];
  setMultipleValidity: (paramName: string, isValid: boolean) => void;
}

function ValueAxesPanel(props: ValueAxesPanelProps) {
  const { addValueAxis, removeValueAxis, seriesParams, valueAxes } = props;

  const getSeries = useCallback(
    (axis: ValueAxis) => {
      const isFirst = valueAxes[0].id === axis.id;
      const series = seriesParams.filter(
        (serie) => serie.valueAxis === axis.id || (isFirst && !serie.valueAxis)
      );
      return series.map((serie) => serie.data.label).join(', ');
    },
    [seriesParams, valueAxes]
  );

  const removeButtonTooltip = useMemo(
    () =>
      i18n.translate('visTypeXy.controls.pointSeries.valueAxes.removeButtonTooltip', {
        defaultMessage: 'Remove Y-axis',
      }),
    []
  );

  const renderRemoveButton = useCallback(
    (axis: ValueAxis) => (
      <EuiToolTip position="bottom" content={removeButtonTooltip}>
        <EuiButtonIcon
          color="danger"
          iconType="cross"
          onClick={() => removeValueAxis(axis)}
          aria-label={removeButtonTooltip}
          data-test-subj="removeValueAxisBtn"
        />
      </EuiToolTip>
    ),
    [removeValueAxis, removeButtonTooltip]
  );

  const addButtonTooltip = useMemo(
    () =>
      i18n.translate('visTypeXy.controls.pointSeries.valueAxes.addButtonTooltip', {
        defaultMessage: 'Add Y-axis',
      }),
    []
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
            <h3>
              <FormattedMessage
                id="visTypeXy.controls.pointSeries.valueAxes.yAxisTitle"
                defaultMessage="Y-axes"
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip position="bottom" content={addButtonTooltip}>
            <EuiButtonIcon
              iconType="plusInCircleFilled"
              onClick={addValueAxis}
              aria-label={addButtonTooltip}
              data-test-subj="visualizeAddYAxisButton"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      {valueAxes.map((axis, index) => (
        <EuiAccordion
          id={`yAxisAccordion${axis.id}`}
          key={axis.id}
          data-test-subj={`toggleYAxisOptions-${axis.id}`}
          className="visEditorSidebar__section visEditorSidebar__collapsible"
          initialIsOpen={false}
          buttonContent={getButtonContent(axis)}
          buttonClassName="eui-textTruncate"
          buttonContentClassName="visEditorSidebar__aggGroupAccordionButtonContent eui-textTruncate"
          aria-label={i18n.translate(
            'visTypeXy.controls.pointSeries.valueAxes.toggleOptionsAriaLabel',
            {
              defaultMessage: 'Toggle {axisName} options',
              values: { axisName: axis.name },
            }
          )}
          extraAction={valueAxes.length === 1 ? undefined : renderRemoveButton(axis)}
        >
          <>
            <EuiSpacer size="m" />
            <ValueAxisOptions
              axis={axis}
              index={index}
              valueAxis={valueAxes[index]}
              onValueAxisPositionChanged={props.onValueAxisPositionChanged}
              setParamByIndex={props.setParamByIndex}
              setMultipleValidity={props.setMultipleValidity}
            />
          </>
        </EuiAccordion>
      ))}
    </EuiPanel>
  );
}

export { ValueAxesPanel };
