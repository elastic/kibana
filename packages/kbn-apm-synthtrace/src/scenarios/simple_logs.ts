/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { LogDocument, log } from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';

const scenario: Scenario<LogDocument> = async () => {
  return {
    generate: ({ range }) => {
      const LOG_LEVELS = ['info', 'debug', 'error'];
      const MESSAGES = ['A simple log', 'Yet another log', 'Something went wrong'];

      const services = Array(5)
        .fill(0)
        .map((_, idx) => log.service(`service-${idx}`));

      return range
        .interval('1m')
        .rate(1)
        .generator((timestamp, timestampIndex) => {
          return services.map((service) => {
            return service
              .message(MESSAGES[Math.floor(Math.random() * 3)])
              .logLevel(LOG_LEVELS[Math.floor(Math.random() * 3)])
              .timestamp(timestamp);
          });
        });
    },
  };
};

export default scenario;
