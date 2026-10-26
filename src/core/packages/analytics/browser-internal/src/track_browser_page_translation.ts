/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subscription } from 'rxjs';
import type { AnalyticsClient, RootSchema } from '@elastic/ebt/client';
import type { Logger } from '@kbn/logging';

/**
 * Which browser-translation signal fired. A page translator runs in an isolated
 * world, so these are signals the shared DOM raises. Nothing here patches
 * `Node.prototype` or shadows methods on `<html>`.
 */
export type BrowserPageTranslationDetector =
  | 'chrome_html_class'
  | 'html_lang_changed'
  | 'font_signature';

export interface BrowserPageTranslatedEvent {
  detector: BrowserPageTranslationDetector;
}

const BROWSER_PAGE_TRANSLATED_EVENT_TYPE = 'browser_page_translated';

const schema: RootSchema<BrowserPageTranslatedEvent> = {
  detector: {
    type: 'keyword',
    _meta: {
      description:
        'Which signal showed that a browser translator may be rewriting the page. ' +
        '`chrome_html_class`: `<html>` has the class `translated-ltr` or `translated-rtl`. ' +
        '`html_lang_changed`: `<html lang>` changed after the page loaded. Kibana sets `lang` in the server render, so that initial value is not reported, and writing the same value again does not count. A later change can be Firefox or another script. ' +
        '`font_signature`: a translator `<font>` wrapper was inserted (Edge or the Google Translate extension). ' +
        'Reported at most once per page load. Does not include the page URL or any translated text.',
    },
  },
};

/** Chrome's translator adds exactly this class token to `<html>` before it rewrites text. */
const TRANSLATED_HTML_CLASS = /(?:^|\s)translated-(?:ltr|rtl)(?:\s|$)/;

/**
 * Edge and the Google Translate extension never mark `<html>`; they wrap text
 * in `<font>`. A translator's isolated world does not call the page's DOM
 * methods, so the animation is what crosses that boundary. The selector is the
 * element name only: `font[style*="vertical-align"]` makes Chrome restyle the
 * page on every inline style change, and this sheet stays installed until a
 * translator is detected. `isTranslatorFont` checks the signature when
 * `animationstart` fires. `!important` keeps a page-wide `animation: none`
 * from silencing it, and the keyframes do not change pixels.
 */
const TRANSLATOR_FONT_SELECTOR = 'font';

const DETECTION_ANIMATION_NAME = 'kbn-browser-page-translation-detect';

const DETECTION_CSS =
  `@keyframes ${DETECTION_ANIMATION_NAME}{from{opacity:1}to{opacity:1}}` +
  `${TRANSLATOR_FONT_SELECTOR}{animation-duration:1ms!important;animation-name:${DETECTION_ANIMATION_NAME}!important}`;

function hasTranslatedClass(html: Element): boolean {
  return TRANSLATED_HTML_CLASS.test(html.getAttribute('class') ?? '');
}

function isTranslatorFont(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement) || target.tagName !== 'FONT') {
    return false;
  }
  return (
    target.style.verticalAlign === 'inherit' ||
    target.hasAttribute('_msttexthash') ||
    target.hasAttribute('_msthash') ||
    target.hasAttribute('_mstmutation')
  );
}

function runGuarded(logger: Logger, action: string, fn: () => void): void {
  try {
    fn();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to ${action}: ${reason}`);
  }
}

/**
 * Constructable stylesheets survive a `style-src 'self'` policy that blocks an
 * injected `<style>` element. The style element covers engines without
 * `adoptedStyleSheets`.
 */
function installDetectionStylesheet(doc: Document): () => void {
  const view = doc.defaultView;
  const StyleSheet = view?.CSSStyleSheet ?? globalThis.CSSStyleSheet;
  try {
    if (typeof StyleSheet === 'function' && Array.isArray(doc.adoptedStyleSheets)) {
      const sheet = new StyleSheet();
      sheet.replaceSync(DETECTION_CSS);
      const previous = doc.adoptedStyleSheets;
      doc.adoptedStyleSheets = [...previous, sheet];
      return () => {
        doc.adoptedStyleSheets = doc.adoptedStyleSheets.filter((candidate) => candidate !== sheet);
      };
    }
  } catch {
    // Fall through to a style element.
  }

  try {
    const style = doc.createElement('style');
    style.setAttribute('data-kbn-browser-page-translation', '');
    style.textContent = DETECTION_CSS;
    (doc.head ?? doc.documentElement).appendChild(style);
    return () => {
      style.remove();
    };
  } catch {
    return () => undefined;
  }
}

/** Registers `browser_page_translated` and reports it once per page load when a browser translator starts rewriting `doc`. */
export function trackBrowserPageTranslation(
  analytics: AnalyticsClient,
  logger: Logger,
  doc: Document = document
): Subscription {
  analytics.registerEventType<BrowserPageTranslatedEvent>({
    eventType: BROWSER_PAGE_TRANSLATED_EVENT_TYPE,
    schema,
  });

  const html = doc.documentElement;
  if (!html) {
    return new Subscription();
  }

  let stopped = false;
  const teardowns: Array<() => void> = [];
  const stop = () => {
    if (stopped) {
      return;
    }
    stopped = true;
    for (const undo of teardowns) {
      runGuarded(logger, 'remove the browser page translation detector', undo);
    }
  };

  const report = (detector: BrowserPageTranslationDetector) => {
    if (stopped) {
      return;
    }
    stop();
    runGuarded(logger, 'report browser_page_translated', () => {
      analytics.reportEvent(BROWSER_PAGE_TRANSLATED_EVENT_TYPE, { detector });
    });
  };

  // Captured once. MutationObserver also records `html.lang = html.lang` and
  // setAttribute of the current value, and comparing against this ignores those.
  const initialLang = html.getAttribute('lang');

  const onRecords = (records: MutationRecord[]) => {
    if (stopped) {
      return;
    }
    if (hasTranslatedClass(html)) {
      report('chrome_html_class');
      return;
    }
    // Kibana sets `<html lang>` in the server render, before this observer exists.
    // A later change can be Firefox or another script. A no-op write is not one.
    if (
      records.some((record) => record.attributeName === 'lang') &&
      html.getAttribute('lang') !== initialLang
    ) {
      report('html_lang_changed');
    }
  };

  runGuarded(logger, 'install the browser page translation detector', () => {
    try {
      const sentinel = new MutationObserver((records) => {
        runGuarded(logger, 'read browser translation markers on <html>', () => {
          onRecords(records);
        });
      });
      teardowns.push(() => {
        sentinel.disconnect();
      });
      sentinel.observe(html, { attributes: true, attributeFilter: ['lang', 'class'] });

      teardowns.push(installDetectionStylesheet(doc));

      const onAnimationStart = (event: Event) => {
        runGuarded(logger, 'read a translator font animation', () => {
          if (stopped) {
            return;
          }
          const animationName = 'animationName' in event ? event.animationName : undefined;
          if (animationName !== DETECTION_ANIMATION_NAME || !isTranslatorFont(event.target)) {
            return;
          }
          report('font_signature');
        });
      };
      doc.addEventListener('animationstart', onAnimationStart, true);
      teardowns.push(() => {
        doc.removeEventListener('animationstart', onAnimationStart, true);
      });

      if (hasTranslatedClass(html)) {
        report('chrome_html_class');
      }
    } catch (error) {
      stop();
      throw error;
    }
  });

  return new Subscription(stop);
}
