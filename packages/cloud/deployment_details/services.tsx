/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren, useContext } from 'react';

export interface DeploymentDetailsContextValue {
  cloudId?: string;
  elasticsearchUrl?: string;
  managementUrl?: string;
  apiKeysLearnMoreUrl: string;
  cloudIdLearnMoreUrl: string;
  navigateToUrl(url: string): Promise<void>;
}

const DeploymentDetailsContext = React.createContext<DeploymentDetailsContextValue | null>(null);

/**
 * Abstract external service Provider.
 */
export const DeploymentDetailsProvider: FC<PropsWithChildren<DeploymentDetailsContextValue>> = ({
  children,
  ...services
}) => {
  return (
    <DeploymentDetailsContext.Provider value={services}>
      {children}
    </DeploymentDetailsContext.Provider>
  );
};

/**
 * Kibana-specific service types.
 */
export interface DeploymentDetailsKibanaDependencies {
  /** CoreStart contract */
  core: {
    application: {
      navigateToUrl(url: string): Promise<void>;
    };
  };
  /** SharePluginStart contract */
  share: {
    url: {
      locators: {
        get(
          id: string
        ): undefined | { useUrl: (params: { sectionId: string; appId: string }) => string };
      };
    };
  };
  /** CloudSetup contract */
  cloud: {
    isCloudEnabled: boolean;
    cloudId?: string;
    elasticsearchUrl?: string;
  };
  /** DocLinksStart contract */
  docLinks: {
    links: {
      fleet: {
        apiKeysLearnMore: string;
      };
      cloud: {
        beatsAndLogstashConfiguration: string;
      };
    };
  };
}

/**
 * Kibana-specific Provider that maps to known dependency types.
 */
export const DeploymentDetailsKibanaProvider: FC<
  PropsWithChildren<DeploymentDetailsKibanaDependencies>
> = ({ children, ...services }) => {
  const {
    core: {
      application: { navigateToUrl },
    },
    cloud: { isCloudEnabled, cloudId, elasticsearchUrl },
    share: {
      url: { locators },
    },
    docLinks: {
      links: {
        fleet: { apiKeysLearnMore },
        cloud: { beatsAndLogstashConfiguration },
      },
    },
  } = services;

  const managementUrl = locators
    .get('MANAGEMENT_APP_LOCATOR')
    ?.useUrl({ sectionId: 'security', appId: 'api_keys' });

  return (
    <DeploymentDetailsProvider
      cloudId={isCloudEnabled ? cloudId : undefined}
      elasticsearchUrl={elasticsearchUrl}
      managementUrl={managementUrl}
      apiKeysLearnMoreUrl={apiKeysLearnMore}
      cloudIdLearnMoreUrl={beatsAndLogstashConfiguration}
      navigateToUrl={navigateToUrl}
    >
      {children}
    </DeploymentDetailsProvider>
  );
};

/**
 * React hook for accessing pre-wired services.
 */
export function useDeploymentDetails() {
  const context = useContext(DeploymentDetailsContext);

  if (!context) {
    throw new Error(
      'DeploymentDetailsContext is missing. Ensure your component or React root is wrapped with <DeploymentDetailsProvider /> or <DeploymentDetailsKibanaProvider />.'
    );
  }

  return context;
}
