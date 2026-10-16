/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Capabilities } from 'selenium-webdriver';
import { createBrowserVideoCapture } from './browser_video_capture';

interface Packet {
  id: number;
  method: string;
  params: { targetId?: string };
  sessionId?: string;
}
class CaptureSocket extends EventTarget {
  public static readonly OPEN = 1;
  public static packets: Packet[] = [];
  public static dropScreenshot = false;
  public static onScreenshot: (() => void) | undefined;
  public readyState = 1;
  constructor(_url: string) {
    super();
    Promise.resolve().then(() => this.dispatchEvent(new Event('open')));
  }
  public send(message: string): void {
    const packet: Packet = JSON.parse(message);
    CaptureSocket.packets.push(packet);
    if (packet.method === 'Page.captureScreenshot' && CaptureSocket.dropScreenshot) return;
    let result: {
      targetInfos?: Array<{ targetId: string; type: string }>;
      sessionId?: string;
      data?: string;
    } = {};
    if (packet.method === 'Target.getTargets')
      result = {
        targetInfos: [
          { targetId: 'first', type: 'page' },
          { targetId: 'second', type: 'page' },
        ],
      };
    if (packet.method === 'Target.attachToTarget')
      result = { sessionId: 'session-' + packet.params.targetId };
    if (packet.method === 'Page.captureScreenshot') {
      CaptureSocket.onScreenshot?.();
      result = { data: Buffer.from(packet.sessionId ?? '').toString('base64') };
    }
    Promise.resolve().then(() =>
      this.dispatchEvent(
        new MessageEvent('message', { data: JSON.stringify({ id: packet.id, result }) })
      )
    );
  }
  public close(): void {
    this.readyState = 3;
    this.dispatchEvent(new Event('close'));
  }
}
const originalSocket = Object.getOwnPropertyDescriptor(globalThis, 'WebSocket');
beforeEach(() => {
  Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: CaptureSocket });
  CaptureSocket.packets = [];
  CaptureSocket.dropScreenshot = false;
  CaptureSocket.onScreenshot = undefined;
});
afterEach(() => {
  if (originalSocket) Object.defineProperty(globalThis, 'WebSocket', originalSocket);
  else Reflect.deleteProperty(globalThis, 'WebSocket');
  jest.useRealTimers();
});
const driver = {
  getCapabilities: async () => new Capabilities().set('se:cdp', 'ws://capture.test'),
};

it('captures through an independent channel and follows the active window', async () => {
  let handle = 'CDwindow-first';
  const capture = await createBrowserVideoCapture(driver, () => handle);
  expect((await capture.captureFrame()).toString()).toBe('session-first');
  handle = 'second';
  expect((await capture.captureFrame()).toString()).toBe('session-second');
  handle = 'first';
  await capture.captureFrame();
  capture.close();
  expect(CaptureSocket.packets.filter((p) => p.method === 'Target.attachToTarget')).toHaveLength(2);
});

it('rejects an image of a window that stopped being active during capture', async () => {
  let handle = 'first';
  const capture = await createBrowserVideoCapture(driver, () => handle);
  CaptureSocket.onScreenshot = () => {
    handle = 'second';
  };
  await expect(capture.captureFrame()).rejects.toThrow('window changed');
  capture.close();
});

it('fails explicitly when the active window cannot be mapped to a page target', async () => {
  const capture = await createBrowserVideoCapture(driver, () => 'unknown');
  await expect(capture.captureFrame()).rejects.toThrow('Cannot identify active browser window');
  capture.close();
});

it('closes pending captures without leaving protocol timers behind', async () => {
  jest.useFakeTimers();
  CaptureSocket.dropScreenshot = true;
  const capture = await createBrowserVideoCapture(driver, () => 'first');
  const pending = capture.captureFrame();
  const rejection = expect(pending).rejects.toThrow('connection closed');
  await jest.advanceTimersByTimeAsync(1);
  capture.close();
  await rejection;
  expect(jest.getTimerCount()).toBe(0);
});
