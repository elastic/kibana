/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { FC, MouseEvent } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiSpacer,
  EuiText,
  EuiTitle,
  mathWithUnits,
  useEuiMinBreakpoint,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { FormattedMessage } from '@kbn/i18n-react';
import { METRIC_TYPE } from '@kbn/analytics';
import type { ApplicationStart } from '@kbn/core/public';
import { MoveData } from '../move_data';
import { SetupCloudConnect, CalloutSkeleton } from '../setup_cloud_connect';
import { createAppNavigationHandler } from '../app_navigation_handler';
import { getServices } from '../../kibana_services';

interface Props {
  addBasePath: (path: string) => string;
  application: ApplicationStart;
  isDarkMode: boolean;
  isCloudEnabled: boolean;
}

export const AddData: FC<Props> = ({ addBasePath, application, isDarkMode, isCloudEnabled }) => {
  const { trackUiMetric, addDataService } = getServices();
  const euiBreakpointM = useEuiMinBreakpoint('m');
  const euiBreakpointL = useEuiMinBreakpoint('l');
  const styles = ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'block',
      marginBlock: `0 -${mathWithUnits([euiTheme.size.xl, euiTheme.size.xs], (x, y) => x + y)}`,
      marginInline: 'auto',
      [euiBreakpointM]: {
        marginBlockEnd: euiTheme.size.xl,
      },
      [euiBreakpointL]: {
        inlineSize: '80%',
      },
    });

  // Check cloud connect status
  const useCloudConnectStatus = useMemo(
    () => addDataService.getCloudConnectStatusHook(),
    [addDataService]
  );
  const { isLoading: isCloudConnectStatusLoading, isCloudConnected: isAlreadyConnected } =
    useCloudConnectStatus();

  const canAccessIntegrations = application.capabilities.navLinks.integrations;
  const hasCloudConnectPermission = Boolean(
    application.capabilities.cloudConnect?.show || application.capabilities.cloudConnect?.configure
  );
  const shouldShowCloudConnectCallout = hasCloudConnectPermission && !isAlreadyConnected;
  if (canAccessIntegrations) {
    return (
      <KibanaPageTemplate.Section
        bottomBorder
        paddingSize="xl"
        aria-labelledby="homeDataAdd__title"
      >
        <EuiFlexGroup alignItems="flexEnd">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2 id="homeDataAdd__title">
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
                {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
                <EuiButton
                  data-test-subj="homeAddData"
                  fill={false}
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
              hasCloudConnectPermission ? (
                isCloudConnectStatusLoading ? (
                  <CalloutSkeleton />
                ) : shouldShowCloudConnectCallout ? (
                  <SetupCloudConnect addBasePath={addBasePath} application={application} />
                ) : (
                  <MoveData addBasePath={addBasePath} />
                )
              ) : (
                <MoveData addBasePath={addBasePath} />
              )
            ) : (
              <EuiImage
                alt={i18n.translate('home.addData.illustration.alt.text', {
                  defaultMessage: 'Illustration of Elastic data integrations',
                })}
                css={styles}
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
