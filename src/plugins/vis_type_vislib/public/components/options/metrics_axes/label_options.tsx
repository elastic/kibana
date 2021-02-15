/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';

import { EuiTitle, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { Axis } from '../../../types';
import { TruncateLabelsOption } from '../../common';
import { getRotateOptions } from '../../../utils/collections';
import { SelectOption, SwitchOption } from '../../../../../charts/public';

export type SetAxisLabel = <T extends keyof Axis['labels']>(
  paramName: T,
  value: Axis['labels'][T]
) => void;
export interface LabelOptionsProps {
  axisLabels: Axis['labels'];
  axisFilterCheckboxName: string;
  setAxisLabel: SetAxisLabel;
}

function LabelOptions({ axisLabels, axisFilterCheckboxName, setAxisLabel }: LabelOptionsProps) {
  const setAxisLabelRotate = useCallback(
    (paramName: 'rotate', value: Axis['labels']['rotate']) => {
      setAxisLabel(paramName, Number(value));
    },
    [setAxisLabel]
  );

  const rotateOptions = useMemo(getRotateOptions, []);

  return (
    <>
      <EuiSpacer size="m" />
      <EuiTitle size="xxs">
        <h3>
          <FormattedMessage
            id="visTypeVislib.controls.pointSeries.categoryAxis.labelsTitle"
            defaultMessage="Labels"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <SwitchOption
        label={i18n.translate('visTypeVislib.controls.pointSeries.categoryAxis.showLabelsLabel', {
          defaultMessage: 'Show labels',
        })}
        paramName="show"
        value={axisLabels.show}
        setValue={setAxisLabel}
      />

      <SwitchOption
        data-test-subj={axisFilterCheckboxName}
        disabled={!axisLabels.show}
        label={i18n.translate('visTypeVislib.controls.pointSeries.categoryAxis.filterLabelsLabel', {
          defaultMessage: 'Filter labels',
        })}
        paramName="filter"
        value={axisLabels.filter}
        setValue={setAxisLabel}
      />

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <SelectOption
            disabled={!axisLabels.show}
            label={i18n.translate('visTypeVislib.controls.pointSeries.categoryAxis.alignLabel', {
              defaultMessage: 'Align',
            })}
            options={rotateOptions}
            paramName="rotate"
            value={axisLabels.rotate}
            setValue={setAxisLabelRotate}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <TruncateLabelsOption
            disabled={!axisLabels.show}
            value={axisLabels.truncate}
            setValue={setAxisLabel}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

export { LabelOptions };
