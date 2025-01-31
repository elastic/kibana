/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import React, { FC, MouseEvent } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { FormattedMessage } from '@kbn/i18n-react';
import { METRIC_TYPE } from '@kbn/analytics';
import { ApplicationStart } from '@kbn/core/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { MoveData } from '../move_data';
import { createAppNavigationHandler } from '../app_navigation_handler';
import { getServices } from '../../kibana_services';

interface Props {
  addBasePath: (path: string) => string;
  application: ApplicationStart;
  isDarkMode: boolean;
  isCloudEnabled: boolean;
}

export const AddData: FC<Props> = ({ addBasePath, application, isDarkMode, isCloudEnabled }) => {
  const { trackUiMetric, guidedOnboardingService } = getServices();
  const canAccessIntegrations = application.capabilities.navLinks.integrations;
  if (canAccessIntegrations) {
    return (
      <KibanaPageTemplate.Section
        bottomBorder
        paddingSize="xl"
        className="homDataAdd"
        aria-labelledby="homDataAdd__title"
      >
        <EuiFlexGroup alignItems="flexEnd">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2 id="homDataAdd__title">
                <FormattedMessage
                  id="home.addData.sectionTitle"
                  defaultMessage="Get started by adding integrations"
                />
              </h2>
            </EuiTitle>

            <EuiSpacer />

            <EuiText>
              <p>
                <FormattedMessage
                  id="home.addData.text"
                  defaultMessage="To start working with your data, use one of our many ingest options. Collect data from an app or service, or upload a file. If you're not ready to use your own data, play with a sample data set."
                />
              </p>
            </EuiText>

            <EuiSpacer />

            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem grow={false}>
                <RedirectAppLinks
                  coreStart={{
                    application,
                  }}
                >
                  {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
                  <EuiButton
                    data-test-subj="homeAddData"
                    // when guided onboarding is disabled, this button is primary
                    // otherwise it's secondary, because there is a "guided onboarding" button
                    fill={!guidedOnboardingService?.isEnabled}
                    href={addBasePath('/app/integrations/browse')}
                    iconType="plusInCircle"
                    onClick={(event: MouseEvent) => {
                      trackUiMetric(METRIC_TYPE.CLICK, 'home_tutorial_directory');
                      createAppNavigationHandler('/app/integrations/browse')(event);
                    }}
                    fullWidth
                  >
                    <FormattedMessage
                      id="home.addData.addDataButtonLabel"
                      defaultMessage="Add integrations"
                    />
                  </EuiButton>
                </RedirectAppLinks>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="addSampleData"
                  href={addBasePath('#/tutorial_directory/sampleData')}
                  iconType="documents"
                >
                  <FormattedMessage
                    id="home.addData.sampleDataButtonLabel"
                    defaultMessage="Try sample data"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="uploadFile"
                  href={addBasePath('#/tutorial_directory/fileDataViz')}
                  iconType="importAction"
                >
                  <FormattedMessage
                    id="home.addData.uploadFileButtonLabel"
                    defaultMessage="Upload a file"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem>
            {!isCloudEnabled ? (
              <MoveData addBasePath={addBasePath} />
            ) : (
              <EuiImage
                alt={i18n.translate('home.addData.illustration.alt.text', {
                  defaultMessage: 'Illustration of Elastic data integrations',
                })}
                className="homDataAdd__illustration"
                src={
                  addBasePath('/plugins/kibanaReact/assets/') +
                  (isDarkMode
                    ? 'illustration_integrations_darkmode.svg'
                    : 'illustration_integrations_lightmode.svg')
                }
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>
    );
  } else {
    return null;
  }
};
