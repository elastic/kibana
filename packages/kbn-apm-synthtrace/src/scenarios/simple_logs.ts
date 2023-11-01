/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { LogDocument, log } from '@kbn/apm-synthtrace-client';
import { v4 as uuidv4 } from 'uuid';
import { Scenario } from '../cli/scenario';

const scenario: Scenario<LogDocument> = async () => {
  return {
    setClient: ({ logsEsClient }) => logsEsClient,
    generate: ({ range }) => {
      const MESSAGE_LOG_LEVELS = [
        { message: 'A simple log', level: 'info' },
        { message: 'Yet another debug log', level: 'debug' },
        { message: 'Something went wrong', level: 'error' },
      ];
      const CLOUD_PROVIDERS = ['gcp', 'aws', 'azure'];
      const CLOUD_REGION = ['eu-central-1', 'us-east-1', 'area-51'];

      const CLUSTER = [
        { clusterId: uuidv4(), clusterName: 'synth-cluster-1' },
        { clusterId: uuidv4(), clusterName: 'synth-cluster-2' },
        { clusterId: uuidv4(), clusterName: 'synth-cluster-3' },
      ];

      return range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(20)
            .fill(0)
            .map(() => {
              const index = Math.floor(Math.random() * 3);
              return log
                .create()
                .message(MESSAGE_LOG_LEVELS[index].message)
                .logLevel(MESSAGE_LOG_LEVELS[index].level)
                .service(`service-${index}`)
                .defaults({
                  'trace.id': uuidv4().substring(0, 8),
                  'agent.name': 'synth-agent',
                  'orchestrator.cluster.name': CLUSTER[index].clusterName,
                  'orchestrator.cluster.id': CLUSTER[index].clusterId,
                  'orchestrator.resource.id': uuidv4(),
                  'cloud.provider': CLOUD_PROVIDERS[Math.floor(Math.random() * 3)],
                  'cloud.region': CLOUD_REGION[index],
                  'cloud.availability_zone': `${CLOUD_REGION[index]}a`,
                  'cloud.project.id': uuidv4().substring(0, 8),
                  'cloud.instance.id': uuidv4().substring(0, 8),
                  'log.file.path': `/logs/${uuidv4().substring(0, 4)}.txt`,
                })
                .timestamp(timestamp);
            });
        });
    },
  };
};

export default scenario;
