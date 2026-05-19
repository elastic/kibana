/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare class HmrServer {
  private readonly server;
  private readonly clients;
  private readonly basePath;
  private assignedPort;
  private lastState;
  constructor(basePath?: string);
  start(): Promise<number>;
  get port(): number;
  broadcast(hash: string, time?: string, files?: string[]): void;
  broadcastBuilding(): void;
  broadcastErrors(errors: string[]): void;
  close(): Promise<void>;
}
