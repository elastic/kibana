/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apm, ApmFields, Instance } from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async ({ logger, scenarioOpts }) => {
  const { numServices = 3 } = scenarioOpts || {};

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const transactionName = 'Azure-AWS-Transaction';

      const successfulTimestamps = range.ratePerMinute(60);

      const instances = [...Array(numServices).keys()].map((index) =>
        apm
          .service({ name: `synth-java-${index}`, environment: ENVIRONMENT, agentName: 'java' })
          .instance('instance')
      );
      const instanceSpans = (instance: Instance) => {
        const successfulTraceEvents = successfulTimestamps.generator((timestamp) =>
          instance
            .transaction({ transactionName })
            .timestamp(timestamp)
            .duration(1000)
            .success()
            .children(
              instance
                .span({
                  spanName: 'AWS DynamoDB',
                  spanType: 'db',
                  spanSubtype: 'dynamodb',
                  'service.target.type': 'dynamodb',
                  'span.destination.service.resource': 'dynamodb',
                })
                .duration(50)
                .success()
                .timestamp(timestamp),
              instance
                .span({
                  spanName: 'AWS SQS',
                  spanType: 'messaging',
                  spanSubtype: 'sqs',
                  'service.target.type': 'sqs',
                  'service.target.name': 'queueA',
                  'span.destination.service.resource': 'sqs/queueA',
                })
                .duration(50)
                .success()
                .timestamp(timestamp + 50),
              instance
                .span({
                  spanName: 'AWS SQS',
                  spanType: 'messaging',
                  spanSubtype: 'sqs',
                  'service.target.type': 'sqs',
                  'service.target.name': 'queueB',
                  'span.destination.service.resource': 'sqs/queueB',
                })
                .duration(50)
                .success()
                .timestamp(timestamp + 100),
              instance
                .span({
                  spanName: 'AWS SNS',
                  spanType: 'messaging',
                  spanSubtype: 'sns',
                  'service.target.type': 'sns',
                  'span.destination.service.resource': 'sns',
                })
                .duration(50)
                .success()
                .timestamp(timestamp + 150),
              instance
                .span({
                  spanName: 'AWS S3',
                  spanType: 'storage',
                  spanSubtype: 's3',
                  'service.target.type': 's3',
                  'service.target.name': 'bucketA',
                  'span.destination.service.resource': 's3/bucketA',
                })
                .duration(50)
                .success()
                .timestamp(timestamp + 200),
              instance
                .span({
                  spanName: 'AWS S3',
                  spanType: 'storage',
                  spanSubtype: 's3',
                  'service.target.type': 's3',
                  'service.target.name': 'bucketB',
                  'span.destination.service.resource': 's3/bucketB',
                })
                .duration(50)
                .success()
                .timestamp(timestamp + 250),
              instance
                .span({
                  spanName: 'Azure CosmosDB',
                  spanType: 'db',
                  spanSubtype: 'cosmosdb',
                  'service.target.type': 'cosmosdb',
                  'span.destination.service.resource': 'cosmosdb',
                })
                .duration(50)
                .success()
                .timestamp(timestamp + 300),
              instance
                .span({
                  spanName: 'Azure Queue',
                  spanType: 'messaging',
                  spanSubtype: 'azurequeue',
                  'service.target.type': 'azurequeue',
                  'span.destination.service.resource': 'azurequeue',
                })
                .duration(50)
                .success()
                .timestamp(timestamp + 350),
              instance
                .span({
                  spanName: 'Azure Service Bus',
                  spanType: 'messaging',
                  spanSubtype: 'azureservicebus',
                  'service.target.type': 'azureservicebus',
                  'span.destination.service.resource': 'azureservicebus',
                })
                .duration(50)
                .success()
                .timestamp(timestamp + 400),
              instance
                .span({
                  spanName: 'Azure Blob',
                  spanType: 'storage',
                  spanSubtype: 'azureblob',
                  'service.target.type': 'azureblob',
                  'span.destination.service.resource': 'azureblob',
                })
                .duration(50)
                .success()
                .timestamp(timestamp + 450),
              instance
                .span({
                  spanName: 'Azure File',
                  spanType: 'storage',
                  spanSubtype: 'azurefile',
                  'service.target.type': 'azurefile',
                  'span.destination.service.resource': 'azurefile',
                })
                .duration(50)
                .success()
                .timestamp(timestamp + 500),
              instance
                .span({
                  spanName: 'Azure Table',
                  spanType: 'storage',
                  spanSubtype: 'azuretable',
                  'service.target.type': 'azuretable',
                  'span.destination.service.resource': 'azuretable',
                })
                .duration(50)
                .success()
                .timestamp(timestamp + 550)
            )
        );

        return successfulTraceEvents;
      };

      return withClient(
        apmEsClient,
        logger.perf('generating_apm_events', () => instances.flatMap(instanceSpans))
      );
    },
  };
};

export default scenario;
