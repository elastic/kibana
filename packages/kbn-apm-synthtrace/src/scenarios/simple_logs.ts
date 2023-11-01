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
    generate: ({ range }) => {
      const LOG_LEVELS = ['info', 'debug', 'error'];
      const MESSAGES = ['A simple log', 'Yet another log', 'Something went wrong'];
      const CLOUD_PROVIDERS = ['gcp', 'aws', 'azure'];
      const CLOUD_REGION = ['eu-central-1', 'us-east-1', 'area-51'];

      return range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(20)
            .fill(0)
            .map((_, idx) => {
              return log
                .create()
                .message(MESSAGES[Math.floor(Math.random() * 3)])
                .logLevel(LOG_LEVELS[Math.floor(Math.random() * 3)])
                .service(`service-${Math.floor(Math.random() * 3)}`)
                .defaults({
                  'trace.id': uuidv4().substring(0, 8),
                  'agent.name': 'synth-agent',
                  'orchestrator.cluster.name': 'synth-cluster',
                  'orchestrator.resource.id': uuidv4(),
                  'cloud.provider': CLOUD_PROVIDERS[Math.floor(Math.random() * 3)],
                  'cloud.region': CLOUD_REGION[Math.floor(Math.random() * 3)],
                  'cloud.availability_zone': `${CLOUD_REGION[Math.floor(Math.random() * 3)]}a`,
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
