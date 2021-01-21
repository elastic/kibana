/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';

import { EuiPanel, EuiTitle, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { BasicOptions, SwitchOption, VisOptionsProps } from '../../../../vis_default_editor/public';
import { TruncateLabelsOption } from '../../../../vis_type_xy/public';

import { PieVisParams } from '../../pie';

function PieOptions(props: VisOptionsProps<PieVisParams>) {
  const { stateParams, setValue } = props;
  const setLabels = <T extends keyof PieVisParams['labels']>(
    paramName: T,
    value: PieVisParams['labels'][T]
  ) => setValue('labels', { ...stateParams.labels, [paramName]: value });

  return (
    <>
      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="visTypeVislib.editors.pie.pieSettingsTitle"
              defaultMessage="Pie settings"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <SwitchOption
          label={i18n.translate('visTypeVislib.editors.pie.donutLabel', {
            defaultMessage: 'Donut',
          })}
          paramName="isDonut"
          value={stateParams.isDonut}
          setValue={setValue}
        />
        <BasicOptions {...props} />
      </EuiPanel>

      <EuiSpacer size="s" />

      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="visTypeVislib.editors.pie.labelsSettingsTitle"
              defaultMessage="Labels settings"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <SwitchOption
          label={i18n.translate('visTypeVislib.editors.pie.showLabelsLabel', {
            defaultMessage: 'Show labels',
          })}
          paramName="show"
          value={stateParams.labels.show}
          setValue={setLabels}
        />
        <SwitchOption
          label={i18n.translate('visTypeVislib.editors.pie.showTopLevelOnlyLabel', {
            defaultMessage: 'Show top level only',
          })}
          paramName="last_level"
          value={stateParams.labels.last_level}
          setValue={setLabels}
        />
        <SwitchOption
          label={i18n.translate('visTypeVislib.editors.pie.showValuesLabel', {
            defaultMessage: 'Show values',
          })}
          paramName="values"
          value={stateParams.labels.values}
          setValue={setLabels}
        />
        <TruncateLabelsOption value={stateParams.labels.truncate} setValue={setLabels} />
      </EuiPanel>
    </>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { PieOptions as default };
