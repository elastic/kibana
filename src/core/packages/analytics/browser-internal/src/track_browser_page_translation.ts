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
 * Which browser-translation signal fired. The values match the detectors in
 * translation-resilience (https://github.com/alexspeller/translation-resilience).
 * A page translator runs in an isolated world, so these are signals the shared
 * DOM raises. Nothing here patches Node.prototype.
 */
export type BrowserPageTranslationDetector =
  | 'chrome_html_class'
  | 'firefox_lang'
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
        'Which signal showed that a browser translator is rewriting the page. ' +
        '`chrome_html_class`: `<html>` has the class `translated-ltr` or `translated-rtl`. ' +
        '`firefox_lang`: `<html lang>` was written from outside the page. ' +
        '`font_signature`: a translator `<font>` wrapper was inserted (Edge or the Google Translate extension). ' +
        'Reported at most once per page load. Does not include the page URL or any translated text.',
    },
  },
};

/** Chrome's translator adds exactly this class token to `<html>` before it rewrites text. */
const TRANSLATED_HTML_CLASS = /(?:^|\s)translated-(?:ltr|rtl)(?:\s|$)/;

/**
 * CSS for the same `<font>` signature `isTranslatorFont` checks. Edge and the
 * Google Translate extension never mark `<html>`; they only wrap text in these
 * fonts. A translator's isolated world does not call the page's DOM methods, so
 * the animation is what crosses that boundary. `!important` keeps a page-wide
 * `animation: none` from silencing it, and the keyframes do not change pixels.
 */
const TRANSLATOR_FONT_SELECTOR =
  'font[_msttexthash],font[_msthash],font[_mstmutation],font[style*="vertical-align"]';

const DETECTION_ANIMATION_NAME = 'kbn-browser-page-translation-detect';

const DETECTION_CSS =
  `@keyframes ${DETECTION_ANIMATION_NAME}{from{opacity:1}to{opacity:1}}` +
  `${TRANSLATOR_FONT_SELECTOR}{animation-duration:1ms!important;animation-name:${DETECTION_ANIMATION_NAME}!important}`;

const ATTRIBUTE_WRITE_METHODS = [
  'setAttribute',
  'setAttributeNS',
  'removeAttribute',
  'removeAttributeNS',
  'toggleAttribute',
  'setAttributeNode',
  'setAttributeNodeNS',
  'removeAttributeNode',
] as const;

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
 * Page code reaches `<html>` through these own-property wrappers. A browser
 * translator writes from its isolated world and never sees them, so a `lang`
 * change that arrives any other way is Firefox starting a translation.
 * Kibana's own locale is set on `<html>` from the server render and from
 * these same page objects, and must not count.
 */
function trackPageLangWrites(html: Element, asPageWrite: <T>(write: () => T) => T): () => void {
  const restore: Array<() => void> = [];
  const undoAll = () => {
    for (const undo of restore.splice(0)) {
      undo();
    }
  };

  const shadow = (key: string, descriptor: PropertyDescriptor): void => {
    const previous = Object.getOwnPropertyDescriptor(html, key);
    Object.defineProperty(html, key, descriptor);
    restore.push(() => {
      if (previous) {
        Object.defineProperty(html, key, previous);
      } else {
        Reflect.deleteProperty(html, key);
      }
    });
  };

  try {
    for (const methodName of ATTRIBUTE_WRITE_METHODS) {
      const original = html[methodName] as unknown as (
        this: Element,
        ...args: unknown[]
      ) => unknown;
      if (typeof original !== 'function') {
        continue;
      }
      const wrapper = function (this: Element, ...args: unknown[]): unknown {
        const invoke = () => Reflect.apply(original, this, args);
        return this === html ? asPageWrite(invoke) : invoke();
      };
      shadow(methodName, {
        configurable: true,
        enumerable: false,
        writable: true,
        value: wrapper,
      });
    }

    const langDescriptor = inheritedLangDescriptor(html);
    const getLang = langDescriptor?.get;
    const setLang = langDescriptor?.set;
    if (getLang && setLang) {
      const set = function (this: Element, value: string): void {
        if (this === html) {
          asPageWrite(() => {
            setLang.call(this, value);
          });
        } else {
          setLang.call(this, value);
        }
      };
      shadow('lang', { configurable: true, enumerable: false, get: getLang, set });
    }
  } catch (error) {
    undoAll();
    throw error;
  }

  return undoAll;
}

function inheritedLangDescriptor(html: Element): PropertyDescriptor | undefined {
  let current: object | null = Object.getPrototypeOf(html);
  while (current) {
    const descriptor = Object.getOwnPropertyDescriptor(current, 'lang');
    if (descriptor?.get && descriptor.set) {
      return descriptor;
    }
    current = Object.getPrototypeOf(current);
  }
  return undefined;
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

  const onRecords = (records: MutationRecord[], pageWrite: boolean) => {
    if (stopped) {
      return;
    }
    if (hasTranslatedClass(html)) {
      report('chrome_html_class');
      return;
    }
    if (!pageWrite && records.some((record) => record.attributeName === 'lang')) {
      report('firefox_lang');
    }
  };

  runGuarded(logger, 'install the browser page translation detector', () => {
    try {
      const sentinel = new MutationObserver((records) => {
        runGuarded(logger, 'read browser translation markers on <html>', () => {
          onRecords(records, false);
        });
      });
      teardowns.push(() => {
        sentinel.disconnect();
      });
      sentinel.observe(html, { attributes: true, attributeFilter: ['lang', 'class'] });

      const asPageWrite = <T>(write: () => T): T => {
        const queued = sentinel.takeRecords();
        if (queued.length > 0) {
          onRecords(queued, false);
        }
        try {
          return write();
        } finally {
          const own = sentinel.takeRecords();
          if (own.length > 0) {
            onRecords(own, true);
          }
        }
      };
      teardowns.push(trackPageLangWrites(html, asPageWrite));

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
