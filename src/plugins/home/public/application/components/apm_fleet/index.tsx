/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  EuiButton,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLoadingSpinner,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { getServices } from '../../kibana_services';

const CentralizedContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

interface APIResponse {
  hasData: boolean;
}

export function APMFleet() {
  const { http, getBasePath, uiSettings } = getServices();
  const isDarkTheme = uiSettings.get('theme:darkMode');
  const basePath = getBasePath();
  const [data, setData] = useState<APIResponse | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await http.get('/api/apm/fleet/has_data');
        setData(response as APIResponse);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error while fetching fleet details.', e);
      }
      setIsLoading(false);
    }
    fetchData();
  }, [http]);

  if (isLoading) {
    return (
      <CentralizedContainer>
        <EuiLoadingSpinner />
      </CentralizedContainer>
    );
  }
  // When APM integration is enable in Fleet
  if (data?.hasData) {
    return (
      <EuiButton iconType="gear" fill href={`${basePath}/app/fleet#/policies`}>
        {i18n.translate('home.apm.tutorial.apmServer.fleet.manageApmIntegration.button', {
          defaultMessage: 'Manage APM integration in Fleet',
        })}
      </EuiButton>
    );
  }
  // When APM integration is not installed in Fleet or for some reason the API didn't work out
  return (
    <EuiPanel>
      <EuiFlexGroup>
        <EuiFlexItem grow={7}>
          <EuiCard
            display="plain"
            textAlign="left"
            title={i18n.translate('home.apm.tutorial.apmServer.fleet.title', {
              defaultMessage: 'Elastic APM (beta) now available in Fleet!',
            })}
            description={i18n.translate('home.apm.tutorial.apmServer.fleet.message', {
              defaultMessage:
                'The APM integration installs Elasticsearch templates and Ingest Node pipelines for APM data.',
            })}
            footer={
              <EuiButton
                iconType="analyzeEvent"
                color="secondary"
                href={`${basePath}/app/fleet#/integrations/detail/apm-0.2.0/overview`}
              >
                {i18n.translate('home.apm.tutorial.apmServer.fleet.apmIntegration.button', {
                  defaultMessage: 'APM integration',
                })}
              </EuiButton>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <EuiImage
            src={`${basePath}/plugins/apm/assets/${
              isDarkTheme
                ? 'illustration_integrations_darkmode.svg'
                : 'illustration_integrations_lightmode.svg'
            }`}
            alt="Illustration"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
