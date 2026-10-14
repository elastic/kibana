/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsClient } from '@elastic/ebt/client';
import { loggerMock } from '@kbn/logging-mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import type { Subscription } from 'rxjs';
import { trackBrowserPageTranslation } from './track_browser_page_translation';

interface AnalyticsMock {
  registerEventType: jest.Mock;
  reportEvent: jest.Mock;
}

async function flushMutations(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function createDocument(): Document {
  const doc = document.implementation.createHTMLDocument('kibana');
  doc.documentElement.setAttribute('lang', 'en');
  return doc;
}

function detectionCss(doc: Document): string {
  const adopted = (doc.adoptedStyleSheets ?? [])
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join('');
      } catch {
        return '';
      }
    })
    .join('');
  const inline = Array.from(doc.querySelectorAll('style'))
    .map((style) => style.textContent ?? '')
    .join('');
  return adopted + inline;
}

function detectionAnimationName(doc: Document): string {
  const match = detectionCss(doc).match(/@keyframes\s+([^{\s]+)/);
  if (!match) {
    throw new Error('browser page translation detector did not install its stylesheet');
  }
  return match[1];
}

function dispatchAnimationStart(target: Element, animationName: string): void {
  const event =
    typeof AnimationEvent === 'function'
      ? new AnimationEvent('animationstart', { animationName, bubbles: true })
      : Object.assign(new Event('animationstart', { bubbles: true }), { animationName });
  target.dispatchEvent(event);
}

function writeAttributeFromOutside(element: Element, name: string, value: string): void {
  Element.prototype.setAttribute.call(element, name, value);
}

function writeLangFromOutside(element: Element, value: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'lang');
  if (!descriptor?.set) {
    throw new Error('HTMLElement.prototype.lang setter is missing');
  }
  descriptor.set.call(element, value);
}

describe('trackBrowserPageTranslation', () => {
  const removeChild = Node.prototype.removeChild;
  const insertBefore = Node.prototype.insertBefore;
  const appendChild = Node.prototype.appendChild;
  const setAttribute = Element.prototype.setAttribute;

  let doc: Document;
  let html: HTMLElement;
  let analytics: AnalyticsMock;
  let logger: MockedLogger;
  let subscription: Subscription | undefined;

  beforeEach(() => {
    doc = createDocument();
    html = doc.documentElement;
    analytics = {
      registerEventType: jest.fn(),
      reportEvent: jest.fn(),
    };
    logger = loggerMock.create();
  });

  afterEach(() => {
    subscription?.unsubscribe();
    subscription = undefined;
  });

  function start(target: Document = doc): Subscription {
    subscription = trackBrowserPageTranslation(
      analytics as unknown as AnalyticsClient,
      logger,
      target
    );
    return subscription;
  }

  test('logs detector failures with the core logger', async () => {
    analytics.reportEvent.mockImplementation(() => {
      throw new Error('ship failed');
    });
    start();

    writeAttributeFromOutside(html, 'class', 'translated-ltr');
    await flushMutations();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to report browser_page_translated: ship failed'
    );
  });

  test('registers the browser_page_translated event type', () => {
    start();

    expect(analytics.registerEventType).toHaveBeenCalledTimes(1);
    expect(analytics.registerEventType).toHaveBeenCalledWith({
      eventType: 'browser_page_translated',
      schema: {
        detector: {
          type: 'keyword',
          _meta: {
            description: expect.stringContaining('once per page load'),
          },
        },
      },
    });
    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });

  test('does not patch Node.prototype or Element.prototype', () => {
    start();

    expect(Node.prototype.removeChild).toBe(removeChild);
    expect(Node.prototype.insertBefore).toBe(insertBefore);
    expect(Node.prototype.appendChild).toBe(appendChild);
    expect(Element.prototype.setAttribute).toBe(setAttribute);
    expect(Object.prototype.hasOwnProperty.call(html, 'setAttribute')).toBe(true);
  });

  test('does not report Kibana setting its own locale on <html>', async () => {
    html.setAttribute('lang', 'de');
    start();
    html.setAttribute('lang', 'fr');
    html.lang = 'ja';
    html.setAttributeNS(null, 'lang', 'es');
    html.removeAttribute('lang');
    await flushMutations();

    expect(html.getAttribute('lang')).toBeNull();
    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });

  test.each(['translated-ltr', 'translated-rtl', 'kbn-app translated-ltr'])(
    'reports chrome_html_class when <html> class is %s',
    async (className) => {
      start();

      writeAttributeFromOutside(html, 'class', className);
      await flushMutations();

      expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(analytics.reportEvent).toHaveBeenCalledWith('browser_page_translated', {
        detector: 'chrome_html_class',
      });
    }
  );

  test.each(['translated', 'untranslated-ltr', 'translated-ltrx', 'my-translated-ltr'])(
    'does not report a lookalike <html> class %s',
    async (className) => {
      start();

      writeAttributeFromOutside(html, 'class', className);
      await flushMutations();

      expect(analytics.reportEvent).not.toHaveBeenCalled();
    }
  );

  test('reports chrome_html_class when the page itself sets the translated class', async () => {
    start();

    html.setAttribute('class', 'translated-ltr');

    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(analytics.reportEvent).toHaveBeenCalledWith('browser_page_translated', {
      detector: 'chrome_html_class',
    });
    await flushMutations();
    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
  });

  test('reports chrome_html_class immediately when the page is already translated', () => {
    html.setAttribute('class', 'translated-ltr');

    start();

    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(analytics.reportEvent).toHaveBeenCalledWith('browser_page_translated', {
      detector: 'chrome_html_class',
    });
  });

  test('reports firefox_lang when lang is written from outside the page', async () => {
    start();

    writeAttributeFromOutside(html, 'lang', 'de');
    await flushMutations();

    expect(html.getAttribute('lang')).toBe('de');
    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(analytics.reportEvent).toHaveBeenCalledWith('browser_page_translated', {
      detector: 'firefox_lang',
    });
  });

  test('reports firefox_lang when the lang setter is called from outside the page', async () => {
    start();

    writeLangFromOutside(html, 'ja');
    await flushMutations();

    expect(analytics.reportEvent).toHaveBeenCalledWith('browser_page_translated', {
      detector: 'firefox_lang',
    });
  });

  test('reports at most one event when translation keeps mutating the page', async () => {
    start();

    writeAttributeFromOutside(html, 'class', 'translated-ltr');
    await flushMutations();
    writeAttributeFromOutside(html, 'lang', 'de');
    writeAttributeFromOutside(html, 'class', 'translated-rtl');
    await flushMutations();

    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
  });

  test('installs a stylesheet for translator font signatures', () => {
    start();

    expect(detectionCss(doc)).toContain('font[_msttexthash]');
    expect(detectionCss(doc)).toContain('font[_msthash]');
    expect(detectionCss(doc)).toContain('font[_mstmutation]');
    expect(detectionCss(doc)).toContain('vertical-align');
  });

  test('does not report when a signature font is inserted without the detection animation', async () => {
    start();
    const font = doc.createElement('font');
    font.style.verticalAlign = 'inherit';
    doc.body.appendChild(font);
    await flushMutations();

    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });

  test('reports font_signature for a font with vertical-align inherit', () => {
    start();
    const font = doc.createElement('font');
    font.setAttribute('style', 'vertical-align: inherit;');
    doc.body.appendChild(font);

    dispatchAnimationStart(font, detectionAnimationName(doc));

    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(analytics.reportEvent).toHaveBeenCalledWith('browser_page_translated', {
      detector: 'font_signature',
    });
  });

  test.each(['_msttexthash', '_msthash', '_mstmutation'])(
    'reports font_signature for a font with %s',
    (attribute) => {
      start();
      const font = doc.createElement('font');
      font.setAttribute(attribute, '1');
      doc.body.appendChild(font);

      dispatchAnimationStart(font, detectionAnimationName(doc));

      expect(analytics.reportEvent).toHaveBeenCalledWith('browser_page_translated', {
        detector: 'font_signature',
      });
    }
  );

  test('does not report an application font or an unrelated animation', () => {
    start();
    const animationName = detectionAnimationName(doc);
    const plainFont = doc.createElement('font');
    plainFont.textContent = 'translated by the app';
    const styledFont = doc.createElement('font');
    styledFont.style.verticalAlign = 'top';
    const signatureFont = doc.createElement('font');
    signatureFont.style.verticalAlign = 'inherit';
    doc.body.append(plainFont, styledFont, signatureFont);

    dispatchAnimationStart(plainFont, animationName);
    dispatchAnimationStart(styledFont, animationName);
    dispatchAnimationStart(signatureFont, 'some-other-animation');

    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });

  test('stops listening after unsubscribe', async () => {
    const installed = start();
    installed.unsubscribe();
    subscription = undefined;

    writeAttributeFromOutside(html, 'class', 'translated-ltr');
    writeLangFromOutside(html, 'de');
    await flushMutations();

    expect(Object.prototype.hasOwnProperty.call(html, 'setAttribute')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(html, 'lang')).toBe(false);
    expect(detectionCss(doc)).not.toContain('@keyframes');
    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });
});
