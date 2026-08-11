/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Emotion generates CSS class names in the format `css-{hash}-{label}`.
 * The hash is derived from the CSS content (which includes color values),
 * so it changes between color modes. The label (suffix) is stable -
 * it encodes the component name and variant props.
 *
 * When importing elements serialized in a different color mode, the
 * Emotion class hashes from the export won't match any CSS rules on
 * the current page. This module remaps those stale class names to their
 * current-mode equivalents by matching on the shared label suffix.
 */

/** Matches an Emotion class: `css-{hash}-{label}`, captures the label. */
const EMOTION_CLASS_RE = /^css-[a-z0-9]+-(.+)$/;

/** Matches Emotion class names inside a CSS selector string. */
const SELECTOR_CLASS_RE = /\.(css-[a-z0-9]+-[a-zA-Z_][\w-]*)/g;

const collectRules = (rules: CSSRuleList, map: Map<string, string>): void => {
  for (const rule of rules) {
    if (rule instanceof CSSStyleRule) {
      for (const [, className] of rule.selectorText.matchAll(SELECTOR_CLASS_RE)) {
        const parts = className.match(EMOTION_CLASS_RE);
        if (parts) {
          const label = parts[1];
          if (!map.has(label)) {
            map.set(label, className);
          }
        }
      }
    } else if ('cssRules' in rule) {
      collectRules((rule as CSSGroupingRule).cssRules, map);
    }
  }
};

/**
 * Build a lookup from Emotion label suffix → current-mode full class name
 * by scanning all `<style data-emotion>` sheets on the page.
 */
export const buildEmotionClassMap = (): ReadonlyMap<string, string> => {
  const map = new Map<string, string>();

  for (const styleEl of document.querySelectorAll('style[data-emotion]')) {
    const sheet = (styleEl as HTMLStyleElement).sheet;
    if (!sheet) continue;
    try {
      collectRules(sheet.cssRules, map);
    } catch {
      // Cross-origin sheets, skip
    }
  }

  return map;
};

/**
 * Walk a DOM tree and replace stale Emotion class names with
 * current-mode equivalents (matched by label suffix).
 */
export const remapEmotionClasses = (
  root: Element,
  emotionMap: ReadonlyMap<string, string>
): void => {
  if (emotionMap.size === 0) return;

  const remap = (el: Element): void => {
    for (const cls of el.classList) {
      const parts = cls.match(EMOTION_CLASS_RE);
      if (!parts) continue;
      const label = parts[1];
      const currentClass = emotionMap.get(label);
      if (currentClass && currentClass !== cls) {
        el.classList.replace(cls, currentClass);
      }
    }
  };

  remap(root);
  for (const el of root.querySelectorAll('*')) {
    remap(el);
  }
};
