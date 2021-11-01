/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, MouseEvent } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiImage,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { METRIC_TYPE } from '@kbn/analytics';
import { ApplicationStart } from 'kibana/public';
import { createAppNavigationHandler } from '../app_navigation_handler';
import { getServices } from '../../kibana_services';
import { RedirectAppLinks } from '../../../../../kibana_react/public';

interface Props {
  addBasePath: (path: string) => string;
  application: ApplicationStart;
  isDarkMode: boolean;
}

export const AddData: FC<Props> = ({ addBasePath, application, isDarkMode }) => {
  const { trackUiMetric } = getServices();
  const canAccessIntegrations = application.capabilities.navLinks.integrations;
  if (canAccessIntegrations) {
    return (
      <>
        <section className="homDataAdd" aria-labelledby="homDataAdd__title">
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
                    defaultMessage="To start working with your data, use one of our many ingest options. Collect data from an app or service, or upload a file. If you're not ready to use your own data, add a sample data set."
                  />
                </p>
              </EuiText>

              <EuiSpacer />

              <EuiFlexGroup gutterSize="m" responsive={false} wrap>
                <EuiFlexItem grow={false}>
                  <RedirectAppLinks application={application}>
                    {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
                    <EuiButton
                      data-test-subj="homeAddData"
                      fill
                      href={addBasePath('/app/integrations/browse')}
                      iconType="plusInCircle"
                      onClick={(event: MouseEvent) => {
                        trackUiMetric(METRIC_TYPE.CLICK, 'home_tutorial_directory');
                        createAppNavigationHandler('/app/integrations/browse')(event);
                      }}
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
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiImage
                alt="Illustration of Elastic data integrations"
                className="homDataAdd__illustration"
                src={
                  addBasePath('/plugins/kibanaReact/assets/') +
                  (isDarkMode
                    ? 'illustration_integrations_darkmode.svg'
                    : 'illustration_integrations_lightmode.svg')
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </section>

        <EuiHorizontalRule margin="xxl" />
      </>
    );
  } else {
    return null;
  }
};
