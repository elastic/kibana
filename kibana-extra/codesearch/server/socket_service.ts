/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Socket } from 'socket.io';

import { CloneProgress, RepositoryUri } from '../model';
import { Log } from './log';

export class SocketService {
  private sockets: Map<string, Socket>;

  constructor(private readonly log: Log) {
    this.sockets = new Map<string, Socket>();
  }

  public registerSocket(name: string, s: Socket) {
    this.log.info(`Register socket for ${name}`);
    this.sockets.set(name, s);
  }

  public unregisterSocket(name: string) {
    this.log.info(`Unregister socket for ${name}`);
    this.sockets.delete(name);
  }

  public boardcastCloneProgress(
    repoUri: RepositoryUri,
    progress: number,
    cloneProgress?: CloneProgress
  ) {
    const s = this.sockets.get('clone-progress');
    if (!s) {
      return;
    }
    s.emit('clone-progress', {
      repoUri,
      progress,
      cloneProgress,
    });
  }
}
