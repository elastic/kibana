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
import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { VisOptionsProps } from 'ui/vis/editors/default';
import { BasicVislibParams, Axis } from '../../../types';
import { SwitchOption } from '../../switch';
import { SelectOption } from '../../select';
import { NumberInputOption } from '../../number_input';
import { rotateOptions } from './../utils';
import { ValueAxisOptionsParams } from './value_axis_options';

function ValueAxisCustomOptions({ stateParams, setValue, axis }: ValueAxisOptionsParams) {
  return (
    <>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="kbnVislibVisTypes.controls.pointSeries.valueAxes.customExtentsTitle"
            defaultMessage="Custom extents"
          />
        </h3>
      </EuiTitle>

      <SwitchOption
        label={i18n.translate(
          'kbnVislibVisTypes.controls.pointSeries.valueAxes.scaleToDataBoundsLabel',
          {
            defaultMessage: 'Scale to data bounds',
          }
        )}
        paramName="setAxisLabel"
        value={axis.scale.defaultYExtents}
        setValue={setValue}
      />
    </>
  );
}

export { ValueAxisCustomOptions };
