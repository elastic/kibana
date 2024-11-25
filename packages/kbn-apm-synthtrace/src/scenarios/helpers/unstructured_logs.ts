/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Faker, faker } from '@faker-js/faker';

export type LogMessageGenerator = (f: Faker) => string[];

export const unstructuredLogMessageGenerators = {
  httpAccess: (f: Faker) => [
    `${f.internet.ip()} - - [${f.date
      .past()
      .toISOString()
      .replace('T', ' ')
      .replace(
        /\..+/,
        ''
      )}] "${f.internet.httpMethod()} ${f.internet.url()} HTTP/1.1" ${f.helpers.arrayElement([
      200, 301, 404, 500,
    ])} ${f.number.int({ min: 100, max: 5000 })}`,
  ],
  dbOperation: (f: Faker) => [
    `${f.database.engine()}: ${f.database.column()} ${f.helpers.arrayElement([
      'created',
      'updated',
      'deleted',
      'inserted',
    ])} successfully ${f.number.int({ max: 100000 })} times`,
  ],
  taskStatusSuccess: (f: Faker) => [
    `${f.hacker.noun()}: ${f.word.words()} ${f.string.uuid()} ${f.helpers.arrayElement([
      'triggered',
      'executed',
      'processed',
      'handled',
    ])} successfully at ${f.date.recent().toISOString()}`,
  ],
  taskStatusFailure: (f: Faker) => [
    `${f.hacker.noun()}: ${f.helpers.arrayElement([
      'triggering',
      'execution',
      'processing',
      'handling',
    ])} of ${f.string.uuid()} failed at ${f.date.recent().toISOString()}`,
  ],
  error: (f: Faker) => [
    `${f.helpers.arrayElement([
      'Error',
      'Exception',
      'Failure',
      'Crash',
      'Bug',
      'Issue',
    ])}: ${f.hacker.phrase()}`,
    `Stopping ${f.number.int(42)} background tasks...`,
    `Shutting down process ${f.string.hexadecimal({ length: 16, prefix: '' })}...`,
  ],
  restart: (f: Faker) => {
    const service = f.database.engine();
    return [
      `Restarting ${service}...`,
      `Waiting for queue to drain...`,
      `Service ${service} restarted ${f.helpers.arrayElement([
        'successfully',
        'with errors',
        'with warnings',
      ])}`,
    ];
  },
  userAuthentication: (f: Faker) =>
    f.helpers.arrayElements(
      [
        `User ${f.internet.userName()} (id ${f.string.uuid()}) ${f.helpers.arrayElement([
          'logged in',
          'logged out',
        ])} at ${f.date.recent().toISOString()} from ${f.internet.ip()}:${f.internet.port()}`,
        `Created new user ${f.internet.userName()} (id ${f.string.uuid()})`,
        `Disabled user ${f.internet.userName()} (id ${f.string.uuid()}) due to level ${f.number.int(
          { max: 10 }
        )} ${f.helpers.arrayElement([
          'suspicious activity',
          'security concerns',
          'policy violation',
        ])}`,
        `Login ${f.internet.userName()} (id ${f.string.uuid()}) incorrect ${f.number.int({
          max: 100,
        })} times from ${f.internet.ipv6()}.`,
      ],
      { min: 1, max: 3 }
    ),
  networkEvent: (f: Faker) => [
    `Network ${f.helpers.arrayElement([
      'connection',
      'disconnection',
      'data transfer',
    ])} ${f.helpers.arrayElement(['from', 'to'])} ${f.internet.ip()}`,
  ],
} satisfies Record<string, LogMessageGenerator>;

export const generateUnstructuredLogMessage =
  (generators: LogMessageGenerator[] = Object.values(unstructuredLogMessageGenerators)) =>
  (f: Faker = faker) =>
    f.helpers.arrayElement(generators)(f);
