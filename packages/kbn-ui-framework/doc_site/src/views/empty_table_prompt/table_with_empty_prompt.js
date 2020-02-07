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

import {
  KuiEmptyTablePrompt,
  KuiEmptyTablePromptPanel,
  KuiToolBar,
  KuiToolBarSearchBox,
  KuiPager,
  KuiLinkButton,
  KuiButtonIcon,
  KuiButtonGroup,
} from '../../../../components';

export function ControlledTableWithEmptyPrompt() {
  return (
    <div>
      <KuiToolBar>
        <KuiToolBarSearchBox onFilter={() => {}} />
        <div className="kuiToolBarSection">
          <KuiPager
            startNumber={0}
            endNumber={0}
            totalItems={0}
            hasNextPage={false}
            hasPreviousPage={false}
            onNextPage={() => {}}
            onPreviousPage={() => {}}
          />
        </div>
      </KuiToolBar>
      <KuiEmptyTablePromptPanel>
        <KuiEmptyTablePrompt
          actions={
            <KuiButtonGroup>
              <KuiLinkButton
                icon={<KuiButtonIcon type="create" />}
                aria-label="Add a new dashboard"
                data-test-subj="addNewDashPromptButton"
                buttonType="primary"
                href="#"
              >
                Add a new dashboard
              </KuiLinkButton>

              <KuiLinkButton
                icon={<KuiButtonIcon type="create" />}
                aria-label="Add a new visualization"
                data-test-subj="addNewVizPromptButton"
                buttonType="primary"
                href="#"
              >
                Add a new visualization
              </KuiLinkButton>
            </KuiButtonGroup>
          }
          message="You have no items. Would you like to add one?"
        />
      </KuiEmptyTablePromptPanel>
    </div>
  );
}
