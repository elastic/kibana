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
import { EuiFormErrorText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { getServices } from '../kibana_services';

interface ChartComponentProp {
  className?: string;
  seriesList: any;
  search?(): void;
  interval: any;
  renderComplete: boolean;
}

function ChartComponent({ seriesList, interval, search, renderComplete }: ChartComponentProp) {
  if (!seriesList) {
    return null;
  }

  const panelScope = { seriesList, interval, search, renderComplete } as any;
  panelScope.seriesList.render = seriesList.render || {
    type: 'timechart',
  };

  const panelSchema = getServices().timelionPanels.get(panelScope.seriesList.render.type);

  if (!panelSchema) {
    return (
      <EuiFormErrorText>
        <FormattedMessage
          id="timelion.chart.seriesList.noSchemaWarning"
          defaultMessage="No such panel type: {renderType}"
          values={{ renderType: panelScope.seriesList.render.type }}
        />
      </EuiFormErrorText>
    );
  }

  return panelSchema(panelScope);
}

export { ChartComponent };
