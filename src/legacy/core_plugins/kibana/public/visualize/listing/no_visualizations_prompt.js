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
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  KuiEmptyTablePrompt,
  KuiEmptyTablePromptPanel,
  KuiButton,
  KuiButtonIcon,
} from '@kbn/ui-framework/components';

function NoVisualizationsPromptUi({ onCreateVis, intl }) {
  return (
    <KuiEmptyTablePromptPanel>
      <KuiEmptyTablePrompt
        actions={
          <KuiButton
            onClick={onCreateVis}
            buttonType="primary"
            icon={<KuiButtonIcon type="create"/>}
          >
            <FormattedMessage
              id="kbn.visualize.listing.noVisualizations.createVisualizationButtonLabel"
              defaultMessage="Create a visualization"
            />
          </KuiButton>
        }
        message={intl.formatMessage({
          id: 'kbn.visualize.listing.noVisualizationsText',
          defaultMessage: `Looks like you don't have any visualizations. Let's create some!`,
        })}
      />
    </KuiEmptyTablePromptPanel>
  );
}

export const NoVisualizationsPrompt = injectI18n(NoVisualizationsPromptUi);
