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
import React from 'react';
import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  mathWithUnits,
  useEuiMinBreakpoint,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { METRIC_TYPE } from '@kbn/analytics';
import type { ApplicationStart } from '@kbn/core/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { createAppNavigationHandler } from './app_navigation_handler';
import { getServices } from '../kibana_services';

interface Props {
  addBasePath: (path: string) => string;
  application: ApplicationStart;
  isDarkMode: boolean;
  isCloudEnabled: boolean;
}

export const HomeHeaderActions: FC<Props> = ({ addBasePath, application, isDarkMode, isCloudEnabled }) => {
  const { trackUiMetric } = getServices();
  const euiBreakpointL = useEuiMinBreakpoint('l');
  
  const illustrationStyles = ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'block',
      marginBlock: `0 -${mathWithUnits([euiTheme.size.xl, euiTheme.size.xs], (x, y) => x + y)}`,
      marginInline: 'auto',
      [euiBreakpointL]: {
        inlineSize: '80%',
      },
    });

  const canAccessIntegrations = application.capabilities.navLinks.integrations;
  
  if (!canAccessIntegrations) {
    return null;
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem grow={false}>
            <RedirectAppLinks
              coreStart={{
                application,
              }}
            >
              <EuiButton
                data-test-subj="homeAddData"
                size="s"
                fill={true}
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
              data-test-subj="uploadFile"
              size="s"
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

      {isCloudEnabled && (
        <EuiFlexItem grow={false}>
          <EuiImage
            alt={i18n.translate('home.addData.illustration.alt.text', {
              defaultMessage: 'Illustration of Elastic data integrations',
            })}
            css={illustrationStyles}
            src={
              addBasePath('/plugins/kibanaReact/assets/') +
              (isDarkMode
                ? 'illustration_integrations_darkmode.svg'
                : 'illustration_integrations_lightmode.svg')
            }
            style={{ height: '40px', width: 'auto' }}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
