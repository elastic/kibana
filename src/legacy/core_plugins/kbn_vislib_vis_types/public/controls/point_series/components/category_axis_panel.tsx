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
import { EuiPanel, EuiTitle, EuiSpacer, EuiAccordion } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { VisOptionsProps } from 'ui/vis/editors/default';
import { BasicVislibParams, Axis } from '../../../types';
import { SwitchOption } from '../../switch';
import { SelectOption } from '../../select';
import { LabelOptions } from './label_options';

function CategoryAxisPanel(props: VisOptionsProps<BasicVislibParams>) {
  const { stateParams, setValue, vis } = props;

  const setCategoryAxis = <T extends keyof Axis>(paramName: T, value: Axis[T]) => {
    const categoryAxes = [...stateParams.categoryAxes];
    categoryAxes[0] = {
      ...categoryAxes[0],
      [paramName]: value,
    };
    setValue('categoryAxes', categoryAxes);
  };

  return (
    <>
      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h2>
            <FormattedMessage
              id="kbnVislibVisTypes.controls.pointSeries.categoryAxis.xAxisTitle"
              defaultMessage="X-axis"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />

        <SwitchOption
          label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.categoryAxis.showLabel', {
            defaultMessage: 'Show',
          })}
          paramName="show"
          value={stateParams.categoryAxes[0].show}
          setValue={setCategoryAxis}
        />

        <SelectOption
          id="categoryAxisPosition"
          label={i18n.translate(
            'kbnVislibVisTypes.controls.pointSeries.categoryAxis.positionLabel',
            {
              defaultMessage: 'Position',
            }
          )}
          options={vis.type.editorConfig.collections.positions}
          paramName="position"
          value={stateParams.categoryAxes[0].position}
          setValue={setCategoryAxis}
        />

        <EuiAccordion
          id="visEditorCategoryAccordion"
          className="visEditorSidebar__section visEditorSidebar__collapsible"
          initialIsOpen={false}
          buttonContent={i18n.translate(
            'kbnVislibVisTypes.controls.pointSeries.categoryAxis.advancedOptionsLabel',
            {
              defaultMessage: 'Advanced options',
            }
          )}
          aria-label={i18n.translate(
            'kbnVislibVisTypes.controls.pointSeries.categoryAxis.toggleAdvancedOptionsLabel',
            {
              defaultMessage: 'Toggle advanced options',
            }
          )}
        >
          <>
            <EuiSpacer size="m" />
            <LabelOptions {...props} />
          </>
        </EuiAccordion>
      </EuiPanel>
    </>
  );
}

export { CategoryAxisPanel };
