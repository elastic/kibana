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

import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

export function DisabledLabVisualization({ title }: { title: string }) {
  return (
    <div className="visDisabledLabVisualization">
      <div
        className="kuiVerticalRhythm visDisabledLabVisualization__icon kuiIcon fa-flask"
        aria-hidden="true"
      />
      <div className="kuiVerticalRhythm">
        <FormattedMessage
          id="visualizations.disabledLabVisualizationTitle"
          defaultMessage="{title} is a lab visualization."
          values={{ title: <em className="visDisabledLabVisualization__title">{title}</em> }}
        />
      </div>
      <div className="kuiVerticalRhythm">
        <FormattedMessage
          id="visualizations.disabledLabVisualizationMessage"
          defaultMessage="Please turn on lab-mode in the advanced settings to see lab visualizations."
        />
      </div>
    </div>
  );
}
