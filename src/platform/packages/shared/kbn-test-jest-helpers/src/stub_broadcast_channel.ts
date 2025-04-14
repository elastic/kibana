/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const channelCache: BroadcastChannel[] = [];

class StubBroadcastChannel implements BroadcastChannel {
  constructor(public readonly name: string) {
    channelCache.push(this);
  }

  onmessage = jest.fn();
  onmessageerror = jest.fn();
  close = jest.fn();
  postMessage = jest.fn().mockImplementation((data: any) => {
    channelCache.forEach((channel) => {
      if (channel === this) return; // don't postMessage to ourselves
      if (channel.onmessage) {
        channel.onmessage(new MessageEvent(this.name, { data }));
      }
    });
  });

  addEventListener<K extends keyof BroadcastChannelEventMap>(
    type: K,
    listener: (this: BroadcastChannel, ev: BroadcastChannelEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(type: any, listener: any, options?: any): void {
    throw new Error('Method not implemented.');
  }
  removeEventListener<K extends keyof BroadcastChannelEventMap>(
    type: K,
    listener: (this: BroadcastChannel, ev: BroadcastChannelEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(type: any, listener: any, options?: any): void {
    throw new Error('Method not implemented.');
  }
  dispatchEvent(event: Event): boolean {
    throw new Error('Method not implemented.');
  }
}

/**
 * Returns all BroadcastChannel instances.
 * @returns BroadcastChannel[]
 */
function getBroadcastChannelInstances() {
  return [...channelCache];
}

/**
 * Removes all BroadcastChannel instances.
 */
function clearBroadcastChannelInstances() {
  channelCache.splice(0, channelCache.length);
}

/**
 * Stubs the global window.BroadcastChannel for use in jest tests.
 */
function stubBroadcastChannel() {
  if (!window.BroadcastChannel) {
    window.BroadcastChannel = StubBroadcastChannel;
  }
}

export { stubBroadcastChannel, getBroadcastChannelInstances, clearBroadcastChannelInstances };
