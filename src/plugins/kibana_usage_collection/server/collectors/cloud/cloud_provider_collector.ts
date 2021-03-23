/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { CloudDetector, CloudServiceResponseJson } from './detector';

type Usage = Omit<CloudServiceResponseJson, 'metadata'> & { metadata?: string };

export function registerCloudProviderUsageCollector(usageCollection: UsageCollectionSetup) {
  const cloudDetector = new CloudDetector();
  // determine the cloud service in the background
  cloudDetector.detectCloudService();

  const collector = usageCollection.makeUsageCollector<Usage | undefined>({
    type: 'cloud_provider',
    isReady: () => true,
    async fetch() {
      const details = cloudDetector.getCloudDetails();
      if (!details) {
        return;
      }

      return {
        ...details,
        metadata: details.metadata ? JSON.stringify(details.metadata) : undefined,
      };
    },
    schema: {
      name: {
        type: 'keyword',
        _meta: {
          description: 'The name of the cloud provider',
        },
      },
      id: {
        type: 'keyword',
        _meta: {
          description: 'The ID of the VM',
        },
      },
      vm_type: {
        type: 'keyword',
        _meta: {
          description: 'The VM instance type',
        },
      },
      region: {
        type: 'keyword',
        _meta: {
          description: 'The cloud provider region',
        },
      },
      zone: {
        type: 'keyword',
        _meta: {
          description: 'The availability zone within the region',
        },
      },
      metadata: {
        type: 'text',
        _meta: {
          description: 'Stringified object containing other metadata from the cloud provider',
        },
      },
    },
  });

  usageCollection.registerCollector(collector);
}
