/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WebDriver } from 'selenium-webdriver';

interface CdpResult {
  data?: string;
  sessionId?: string;
  targetInfos?: Array<{ targetId: string; type: string }>;
}

interface CdpResponse {
  id?: number;
  result?: CdpResult;
  error?: { message: string };
}

interface VideoCapture {
  captureFrame: () => Promise<Buffer>;
  close: () => void;
}

/** Captures the active Chromium viewport independently of FTR's serialized WebDriver queue. */
export const createBrowserVideoCapture = async (
  driver: Pick<WebDriver, 'getCapabilities'>,
  getWindowHandle: () => string | undefined
): Promise<VideoCapture> => {
  const capabilities = await driver.getCapabilities();
  let endpoint: string | undefined = capabilities.get('se:cdp');
  if (!endpoint) {
    const options: { debuggerAddress?: string } | undefined =
      capabilities.get('goog:chromeOptions') ?? capabilities.get('ms:edgeOptions');
    if (!options?.debuggerAddress)
      throw new Error('FTR video requires a Chromium DevTools endpoint');
    const response = await fetch(`http://${options.debuggerAddress}/json/version`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok)
      throw new Error(`Cannot resolve browser DevTools endpoint: ${response.status}`);
    const info: { webSocketDebuggerUrl?: string } = await response.json();
    endpoint = info.webSocketDebuggerUrl;
  }
  if (typeof endpoint !== 'string' || !endpoint)
    throw new Error('FTR video requires a Chromium DevTools endpoint');
  const socket = new WebSocket(endpoint);
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error('Cannot connect to browser DevTools for FTR video'));
    }, 5000);
    socket.addEventListener(
      'open',
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true }
    );
    socket.addEventListener(
      'error',
      () => {
        clearTimeout(timeout);
        reject(new Error('Browser video connection failed'));
      },
      { once: true }
    );
  });
  let nextId = 1;
  const sessions = new Map<string, string>();
  const pending = new Map<
    number,
    {
      resolve: (result: CdpResult) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();
  const rejectPending = () => {
    for (const request of pending.values()) {
      clearTimeout(request.timeout);
      request.reject(new Error('Browser video connection closed'));
    }
    pending.clear();
  };
  socket.addEventListener('close', rejectPending);
  socket.addEventListener('error', rejectPending);
  socket.addEventListener('message', (event) => {
    if (typeof event.data !== 'string') return;
    let response: CdpResponse;
    try {
      response = JSON.parse(event.data);
    } catch {
      rejectPending();
      socket.close();
      return;
    }
    if (response.id === undefined) return;
    const request = pending.get(response.id);
    if (!request) return;
    pending.delete(response.id);
    clearTimeout(request.timeout);
    if (response.error) request.reject(new Error(response.error.message));
    else request.resolve(response.result ?? {});
  });
  const send = (
    method: string,
    params: Record<string, string | boolean>,
    sessionId?: string
  ): Promise<CdpResult> =>
    new Promise((resolve, reject) => {
      if (socket.readyState !== WebSocket.OPEN) {
        reject(new Error('Browser video connection closed'));
        return;
      }
      const id = nextId++;
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Browser video command timed out: ${method}`));
      }, 4000);
      pending.set(id, { resolve, reject, timeout });
      try {
        socket.send(JSON.stringify({ id, method, params, sessionId }));
      } catch (error) {
        clearTimeout(timeout);
        pending.delete(id);
        reject(error);
      }
    });
  return {
    captureFrame: async () => {
      const handle = getWindowHandle();
      if (!handle) throw new Error('Browser window transition in progress');
      const targetId = handle.replace(/^CDwindow-/, '');
      let sessionId = sessions.get(targetId);
      if (!sessionId) {
        const targets = await send('Target.getTargets', {});
        if (
          !targets.targetInfos?.some(
            (target) => target.type === 'page' && target.targetId === targetId
          )
        ) {
          throw new Error('Cannot identify active browser window for video capture');
        }
        const attached = await send('Target.attachToTarget', { targetId, flatten: true });
        if (!attached.sessionId) throw new Error('Cannot attach browser video capture');
        sessionId = attached.sessionId;
        sessions.set(targetId, sessionId);
      }
      const response = await send(
        'Page.captureScreenshot',
        { format: 'png', captureBeyondViewport: false },
        sessionId
      );
      if (getWindowHandle() !== handle)
        throw new Error('Browser window changed during video capture');
      if (typeof response.data !== 'string' || !response.data)
        throw new Error('Browser video capture returned no image');
      return Buffer.from(response.data, 'base64');
    },
    close: () => {
      rejectPending();
      socket.close();
    },
  };
};
