/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { strict as assert } from 'assert';
import { createServer } from 'http';
import type { Socket } from 'net';
import { By } from 'selenium-webdriver';
import type { WebDriver } from 'selenium-webdriver';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const browser = getService('browser');
  const retry = getService('retry');
  const remote = getService('__webdriver__');
  let driver: WebDriver;
  const sockets = new Set<Socket>();
  const server = createServer((request, response) => {
    if (request.url?.startsWith('/redirect')) {
      response.writeHead(302, { Location: '/fixture?_t=destination#start' });
      response.end();
      return;
    }
    response.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
    if (request.url?.startsWith('/dialog')) {
      response.end('<html><script>alert("destination prompt")</script></html>');
      return;
    }
    response.end(`<html><body><a id="next" href="/fixture?keep=hello%20world&opaque=~%2F#next">Next</a>
      <script>history.replaceState({key:'router-state'},'',location.href);</script></body></html>`);
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });
  let origin = '';

  describe('browser navigation contracts', function () {
    this.tags(['includeFirefox']);
    before(async () => {
      driver = remote.driver;
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const address = server.address();
      assert(address && typeof address !== 'string');
      origin = `http://127.0.0.1:${address.port}`;
      assert.equal((await driver.getCapabilities()).get('unhandledPromptBehavior'), 'ignore');
    });
    after(async () => {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
        for (const socket of sockets) socket.destroy();
      });
    });

    it('preserves the document for a native hash link and reloads on a repeated get', async () => {
      const url = `${origin}/fixture?keep=hello%20world&opaque=~%2F#start`;
      await browser.get(url);
      await browser.execute(() => {
        document.body.dataset.sentinel = 'original-document';
      });
      assert.deepEqual(await browser.execute(() => history.state), { key: 'router-state' });
      await driver.findElement(By.id('next')).click();
      assert.equal(await browser.execute(() => location.hash), '#next');
      assert.equal(
        await browser.execute(() => document.body.dataset.sentinel),
        'original-document'
      );
      assert.equal(await browser.execute(() => location.search), '?keep=hello%20world&opaque=~%2F');
      await browser.get(url);
      assert.equal(await browser.execute(() => location.hash), '#start');
      assert.equal(await browser.execute(() => document.body.dataset.sentinel ?? null), null);
    });

    it('preserves a different marker supplied by a redirect', async () => {
      await browser.get(`${origin}/redirect`);
      assert.equal(await browser.execute(() => location.search), '?_t=destination');
    });

    it('leaves a dialog opened by the destination page for the caller', async () => {
      try {
        await browser.get(`${origin}/dialog`);
        const alert = await driver.switchTo().alert();
        assert.equal(await alert.getText(), 'destination prompt');
        await alert.dismiss();
      } finally {
        await (await browser.getAlert())?.dismiss();
      }
    });

    for (const kind of ['alert', 'confirm'] as const) {
      it(`preserves the ${kind} opened immediately before cleanup`, async () => {
        const executeScript = driver.executeScript;
        let armed = true;
        driver.executeScript = new Proxy(executeScript, {
          async apply(target, thisArg, args) {
            if (armed) {
              armed = false;
              await executeScript.call(
                driver,
                (promptKind: string) => {
                  window.setTimeout(() => {
                    if (promptKind === 'alert') {
                      window.alert('cleanup race');
                    } else {
                      document.body.dataset.promptResult = String(window.confirm('cleanup race'));
                    }
                  }, 0);
                },
                kind
              );
              await retry.try(async () => {
                assert.equal(await driver.switchTo().alert().getText(), 'cleanup race');
              });
            }
            return Reflect.apply(target, thisArg, args);
          },
        });
        try {
          await browser.get(`${origin}/fixture`);
          const alert = await driver.switchTo().alert();
          assert.equal(await alert.getText(), 'cleanup race');
          await alert.dismiss();
          if (kind === 'confirm') {
            await retry.try(async () => {
              assert.equal(
                await browser.execute(() => document.body.dataset.promptResult),
                'false'
              );
            });
          }
        } finally {
          driver.executeScript = executeScript;
          await (await browser.getAlert())?.dismiss();
        }
      });
    }
  });
};
