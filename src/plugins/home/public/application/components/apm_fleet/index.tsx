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
  const { getBasePath } = getServices();
  const basePath = getBasePath();
  const [data, setData] = useState<APIResponse | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await fetch(`${basePath}/api/apm/fleet/hasData`);
        setData((await response.json()) as APIResponse);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error while fetching fleet details.', e);
      }
      setIsLoading(false);
    }
    fetchData();
  }, [basePath]);

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
        <EuiFlexItem grow={3} style={{ background: 'red' }} />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
