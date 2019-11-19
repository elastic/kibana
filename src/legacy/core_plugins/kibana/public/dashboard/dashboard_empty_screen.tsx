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
import { i18n } from '@kbn/i18n';
import { EuiIcon, EuiI18n, EuiLink } from '@elastic/eui';

export interface Props {
  showIcon: boolean;
  showLinkToVisualize: boolean;
  onLinkClick: () => void;
  messageTokens: readonly [string, string, string, string];
  messageDefaults: readonly [string, string, string, string];
}
export function DashboardEmptyScreen({
  showLinkToVisualize,
  onLinkClick,
  messageTokens,
  messageDefaults,
}: Props) {
  const visualizeAppLinkTest = i18n.translate('kbn.dashboard.visitVisualizeAppLinkText', {
    defaultMessage: 'visit the Visualize app',
  });
  const visualizeAppLink = "<a class='euiLink' href='#/visualize'>" + visualizeAppLinkTest + '</a>';
  const addVisualizationDescription = i18n.translate('kbn.dashboard.addVisualizationDescription3', {
    defaultMessage:
      "If you haven't set up any visualizations yet, {visualizeAppLink} to create your first visualization",
    values: { visualizeAppLink },
  });
  const linkToVisualizeParagraph = (
    <p className="linkToVisualizeParagraph">
      {/* eslint-disable-next-line react/no-danger */}
      <span dangerouslySetInnerHTML={{ __html: addVisualizationDescription }} />
    </p>
  );
  const fillDashboardTitle = i18n.translate('kbn.dashboard.fillDashboardTitle', {
    defaultMessage: 'This dashboard is empty. Let\u2019s fill it up!',
  });
  const addVisualizationLinkTestSubject = 'emptyDashboardAddPanelButton';
  return (
    <React.Fragment>
      <EuiIcon type="dashboardApp" size="xxl" color="subdued" />
      <h2>{fillDashboardTitle}</h2>
      <p>
        <EuiI18n tokens={messageTokens} defaults={messageDefaults}>
          {([description1, description2, label, ariaLabel]: string[]) => (
            <span>
              {description1}
              <EuiLink
                onClick={onLinkClick}
                aria-label={ariaLabel}
                data-test-subj={showLinkToVisualize ? addVisualizationLinkTestSubject : ''}
              >
                {label}
              </EuiLink>
              {description2}
            </span>
          )}
        </EuiI18n>
      </p>
      {showLinkToVisualize ? linkToVisualizeParagraph : null}
    </React.Fragment>
  );
}
