/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RequestAdapter, Request } from '@kbn/inspector-plugin/public';

/**
 * A request adapter that aggregates multiple separate adapters into one to allow inspection
 */
export class AggregateRequestAdapter extends RequestAdapter {
  private readonly adapters: RequestAdapter[];

  constructor(adapters: RequestAdapter[]) {
    super();
    this.adapters = adapters;
  }

  public reset(...args: Parameters<RequestAdapter['reset']>): void {
    super.reset(...args);
    this.adapters.forEach((adapter) => adapter.reset(...args));
  }

  public resetRequest(...args: Parameters<RequestAdapter['resetRequest']>): void {
    super.resetRequest(...args);
    this.adapters.forEach((adapter) => adapter.resetRequest(...args));
  }

  public getRequests(...args: Parameters<RequestAdapter['getRequests']>): Request[] {
    return [
      ...super.getRequests(),
      ...this.adapters.map((adapter) => adapter.getRequests(...args)).flat(),
    ];
  }

  public addListener(...args: Parameters<RequestAdapter['addListener']>): this {
    super.addListener(...args);
    this.adapters.forEach((adapter) => adapter.addListener(...args));
    return this;
  }

  public on(...args: Parameters<RequestAdapter['on']>): this {
    super.on(...args);
    this.adapters.forEach((adapter) => adapter.on(...args));
    return this;
  }

  public once(...args: Parameters<RequestAdapter['once']>): this {
    super.once(...args);
    this.adapters.forEach((adapter) => adapter.once(...args));
    return this;
  }

  public removeListener(...args: Parameters<RequestAdapter['removeListener']>): this {
    super.removeListener(...args);
    this.adapters.forEach((adapter) => adapter.removeListener(...args));
    return this;
  }

  public off(...args: Parameters<RequestAdapter['off']>): this {
    super.off(...args);
    this.adapters.forEach((adapter) => adapter.off(...args));
    return this;
  }

  public removeAllListeners(...args: Parameters<RequestAdapter['removeAllListeners']>): this {
    super.removeAllListeners(...args);
    this.adapters.forEach((adapter) => adapter.removeAllListeners(...args));
    return this;
  }

  public setMaxListeners(...args: Parameters<RequestAdapter['setMaxListeners']>): this {
    super.setMaxListeners(...args);
    this.adapters.forEach((adapter) => adapter.setMaxListeners(...args));
    return this;
  }

  public getMaxListeners(...args: Parameters<RequestAdapter['getMaxListeners']>): number {
    return Math.min(
      super.getMaxListeners(...args),
      ...this.adapters.map((adapter) => adapter.getMaxListeners(...args))
    );
  }

  public listeners(...args: Parameters<RequestAdapter['listeners']>): Function[] {
    return [
      ...super.listeners(...args),
      ...this.adapters.map((adapter) => adapter.listeners(...args)).flat(),
    ];
  }

  public rawListeners(...args: Parameters<RequestAdapter['rawListeners']>): Function[] {
    return [
      ...super.rawListeners(...args),
      ...this.adapters.map((adapter) => adapter.rawListeners(...args)).flat(),
    ];
  }

  public emit(...args: Parameters<RequestAdapter['emit']>): boolean {
    return [super.emit(...args), ...this.adapters.map((adapter) => adapter.emit(...args))].every(
      (result) => result
    );
  }

  public listenerCount(...args: Parameters<RequestAdapter['listenerCount']>): number {
    return this.adapters
      .map((adapter) => adapter.listenerCount(...args))
      .reduce((a, b) => a + b, super.listenerCount(...args));
  }

  public prependListener(...args: Parameters<RequestAdapter['prependListener']>): this {
    super.prependListener(...args);
    this.adapters.forEach((adapter) => adapter.prependListener(...args));
    return this;
  }

  public prependOnceListener(...args: Parameters<RequestAdapter['prependOnceListener']>): this {
    super.prependOnceListener(...args);
    this.adapters.forEach((adapter) => adapter.prependOnceListener(...args));
    return this;
  }

  public eventNames(...args: Parameters<RequestAdapter['eventNames']>): Array<string | symbol> {
    return [
      ...super.eventNames(...args),
      ...this.adapters.map((adapter) => adapter.eventNames(...args)).flat(),
    ];
  }
}
