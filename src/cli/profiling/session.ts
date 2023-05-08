/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger } from '@kbn/core/server';

import { Session as InspectorSession } from 'inspector';

export async function createSession(logger?: Logger): Promise<Session> {
  logger?.debug('creating session');

  let session: InspectorSession;
  try {
    session = new InspectorSession();
  } catch (err) {
    throw new Error(`error creating inspector session: ${err.message}`);
  }

  try {
    session.connect();
  } catch (err) {
    throw new Error(`error connecting inspector session: ${err.message}`);
  }

  return new Session(logger, session);
}

export class Session {
  readonly logger: Logger | undefined;
  private session: InspectorSession;

  constructor(logger: Logger | undefined, session: any) {
    this.logger = logger;
    this.session = session;
  }

  async destroy() {
    this.session.disconnect();
  }

  on(event: string, handler: any) {
    this.session.on(event, handler);
  }

  async post(method: string, args?: any) {
    this.logger?.debug(`posting method ${method} ${JSON.stringify(args)}`);
    if (this.session == null) {
      throw new Error('session disconnected');
    }

    const deferred = createDeferred();

    this.session.post(method, args, (err: any, response: any) => {
      if (err) {
        this.logger?.debug(`error from method ${method}: ${err.message}`);
        return deferred.reject(err);
      }
      deferred.resolve(response);
    });

    return deferred.promise;
  }
}

function createDeferred() {
  let resolver: any;
  let rejecter: any;

  function resolve(...args: any[]) {
    resolver(...args);
  }

  function reject(...args: any[]) {
    rejecter(...args);
  }

  const promise = new Promise((resolve_, reject_) => {
    resolver = resolve_;
    rejecter = reject_;
  });

  return { promise, resolve, reject };
}

export function generateFileName() {
  const fileName = new Date()
    .toISOString()
    .replace('T', '_')
    .replace(/\//g, '-')
    .replace(/:/g, '-')
    .substring(5, 19);
  return `${fileName}-${process.pid}`;
}
