/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const browser = getService('browser');
  const find = getService('find');
  const { common, header } = getPageObjects(['common', 'header']);

  describe('FTR navigation and hover', () => {
    for (const { insertTimestamp, throttle } of [
      { insertTimestamp: true, throttle: false },
      { insertTimestamp: false, throttle: false },
      { insertTimestamp: true, throttle: true },
    ]) {
      it(`reloads the same app with insertTimestamp=${insertTimestamp}, FAST_3G=${throttle}`, async () => {
        if (throttle) await browser.setNetworkConditions('FAST_3G');
        try {
          await common.navigateToApp('home', { insertTimestamp });
          const previousDocument = await browser.execute(() => {
            document.documentElement.dataset.ftrDocumentSentinel = 'original';
            return performance.timeOrigin;
          });
          await common.navigateToApp('home', { insertTimestamp });
          const currentDocument = await browser.execute(() => ({
            hasSentinel: 'ftrDocumentSentinel' in document.documentElement.dataset,
            timeOrigin: performance.timeOrigin,
          }));
          expect(currentDocument.hasSentinel).to.be(false);
          expect(currentDocument.timeOrigin).not.to.be(previousDocument);
        } finally {
          if (throttle) await browser.restoreNetworkConditions();
        }
      });
    }

    it('awaits loading completion without requiring spinner appearance', async () => {
      await browser.get('about:blank', false);
      await browser.execute(() => {
        const indicator = document.createElement('div');
        indicator.textContent = 'Loading';
        indicator.dataset.testSubj = 'globalLoadingIndicator';
        document.body.appendChild(indicator);
        setTimeout(() => {
          indicator.dataset.testSubj = 'globalLoadingIndicator-hidden';
          indicator.hidden = true;
        }, 250);
      });
      const originalProbe = header.isGlobalLoadingIndicatorVisible;
      let appearanceProbes = 0;
      header.isGlobalLoadingIndicatorVisible = async () => {
        appearanceProbes++;
        return originalProbe.call(header);
      };
      try {
        await header.waitUntilLoadingHasFinished();
        expect(await (await find.byCssSelector('div')).getAttribute('data-test-subj')).to.be(
          'globalLoadingIndicator-hidden'
        );
        await header.waitUntilLoadingHasFinished();
        expect(appearanceProbes).to.be(0);
      } finally {
        header.isGlobalLoadingIndicatorVisible = originalProbe;
      }
    });

    it('leaves and re-enters an already hovered element', async () => {
      await common.navigateToApp('home');
      await browser.execute(() => {
        const button = document.createElement('button');
        button.id = 'ftr-hover-target';
        button.style.cssText =
          'position:fixed;top:200px;left:200px;width:100px;height:100px;z-index:10000';
        button.dataset.events = '';
        for (const event of ['mouseenter', 'mouseleave']) {
          button.addEventListener(event, () => {
            button.dataset.events += `${event},`;
          });
        }
        document.body.appendChild(button);
      });
      try {
        const button = await find.byCssSelector('#ftr-hover-target');
        await button.moveMouseTo();
        await browser.execute(() => {
          const target = document.getElementById('ftr-hover-target');
          if (target) target.dataset.events = '';
        });
        await button.moveMouseTo();
        expect(await button.getAttribute('data-events')).to.be('mouseleave,mouseenter,');
      } finally {
        await browser.execute(() => document.getElementById('ftr-hover-target')?.remove());
      }
    });
  });
};
