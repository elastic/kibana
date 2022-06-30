/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fromEvent } from 'rxjs';
import type { AnalyticsClient } from '@kbn/analytics-client';

/** HTML attributes that should be skipped from reporting because they might contain user data */
const POTENTIAL_PII_HTML_ATTRIBUTES = ['value'];

/**
 * Registers the event type "click" in the analytics client.
 * Then it listens to all the "click" events in the UI and reports them with the `target` property being a
 * full list of the element's and its parents' attributes. This allows
 * @param analytics
 */
export function trackClicks(analytics: AnalyticsClient, isDevMode: boolean) {
  analytics.registerEventType<{ target: string[] }>({
    eventType: 'click',
    schema: {
      target: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: {
            description:
              'The attributes of the clicked element and all its parents in the form `{attr.name}={attr.value}`. It allows finding the clicked elements by looking up its attributes like "data-test-subj=my-button".',
          },
        },
      },
    },
  });

  // window or document?
  // I tested it on multiple browsers and it seems to work the same.
  // My assumption is that window captures other documents like iframes as well?
  return fromEvent(window, 'click').subscribe((event) => {
    try {
      const target = event.target as HTMLElement;
      analytics.reportEvent('click', { target: getTargetDefinition(target) });
    } catch (error) {
      if (isDevMode) {
        // Defensively log the error in dev mode to catch any potential bugs.
        // eslint-disable-next-line no-console
        console.error(`Failed to report the click event`, { event, error });
      }
    }
  });
}

/**
 * Returns a list of strings consisting on the tag name and all the attributes of the element.
 * Additionally, it recursively walks up the DOM tree to find all the parents' definitions and prepends them to the list.
 *
 * @example
 * From
 * ```html
 * <div data-test-subj="my-parent">
 *   <div data-test-subj="my-button" />
 * </div>
 * ```
 * it returns ['DIV', 'data-test-subj=my-parent', 'DIV', 'data-test-subj=my-button']
 * @param target The child node to start from.
 */
function getTargetDefinition(target: HTMLElement): string[] {
  return [
    ...(target.parentElement ? getTargetDefinition(target.parentElement) : []),
    target.tagName,
    ...[...target.attributes]
      .filter((attr) => !POTENTIAL_PII_HTML_ATTRIBUTES.includes(attr.name))
      .map((attr) => `${attr.name}=${attr.value}`),
  ];
}
