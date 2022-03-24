/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';

import { EuiTitle, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { SelectOption, SwitchOption } from '../../../../../../../vis_default_editor/public';
import { Labels } from '../../../../../../../charts/public';

import { TruncateLabelsOption } from '../../common';
import { getRotateOptions } from '../../../collections';

export type SetAxisLabel = <T extends keyof Labels>(paramName: T, value: Labels[T]) => void;
export interface LabelOptionsProps {
  axisLabels: Labels;
  axisFilterCheckboxName: string;
  setAxisLabel: SetAxisLabel;
  disableSingleLayerAxisControls?: boolean;
}

function LabelOptions({
  axisLabels,
  axisFilterCheckboxName,
  setAxisLabel,
  disableSingleLayerAxisControls,
}: LabelOptionsProps) {
  const setAxisLabelRotate = useCallback(
    (paramName: 'rotate', value: Labels['rotate']) => {
      setAxisLabel(paramName, Number(value));
    },
    [setAxisLabel]
  );

  const rotateOptions = useMemo(getRotateOptions, []);
  const multilayerAxisTooltipText = disableSingleLayerAxisControls
    ? i18n.translate(
        'visTypeXy.controls.pointSeries.categoryAxis.axisLabelsOptionsMultilayer.disabled',
        {
          defaultMessage: 'This option can be configured only with non-time-based axes',
        }
      )
    : undefined;
  const axisLabelControlDisabled = !axisLabels.show || disableSingleLayerAxisControls;

  return (
    <>
      <EuiSpacer size="m" />
      <EuiTitle size="xxs">
        <h3>
          <FormattedMessage
            id="visTypeXy.controls.pointSeries.categoryAxis.labelsTitle"
            defaultMessage="Labels"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <SwitchOption
        label={i18n.translate('visTypeXy.controls.pointSeries.categoryAxis.showLabelsLabel', {
          defaultMessage: 'Show labels',
        })}
        paramName="show"
        value={axisLabels.show}
        setValue={setAxisLabel}
      />
      <SwitchOption
        data-test-subj={axisFilterCheckboxName}
        disabled={axisLabelControlDisabled}
        label={i18n.translate('visTypeXy.controls.pointSeries.categoryAxis.filterLabelsLabel', {
          defaultMessage: 'Filter labels',
        })}
        paramName="filter"
        value={axisLabels.filter}
        setValue={setAxisLabel}
        tooltip={multilayerAxisTooltipText}
      />

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiToolTip content={multilayerAxisTooltipText} delay="long" position="right">
            <SelectOption
              disabled={axisLabelControlDisabled}
              label={i18n.translate('visTypeXy.controls.pointSeries.categoryAxis.alignLabel', {
                defaultMessage: 'Align',
              })}
              options={rotateOptions}
              paramName="rotate"
              value={axisLabels.rotate}
              setValue={setAxisLabelRotate}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiToolTip content={multilayerAxisTooltipText} delay="long" position="right">
            <TruncateLabelsOption
              disabled={axisLabelControlDisabled}
              value={axisLabels.truncate}
              setValue={setAxisLabel}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

export { LabelOptions };
