/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { AnalyticsClient } from '@kbn/analytics-client';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';

const HTML_ATTRIBUTES_TO_TRACK = 'data-ebt-render-time';
const TARGET_ID = 'data-ebt-target';

export function trackRenderMutations(analytics: AnalyticsClient, isDevMode: boolean) {
  const config = {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: [HTML_ATTRIBUTES_TO_TRACK],
  };
  const cb = (mutationList: MutationRecord[]) => {
    for (const mutation of mutationList) {
      if (mutation.type === 'attributes') {
        const changedAttrName = mutation.attributeName;
        const value = mutation.target.getAttribute(changedAttrName);
        const targetId = mutation.target.getAttribute(TARGET_ID);

        if (isDevMode) {
          if (!targetId) {
            console.error(
              `Failed to report the mutation event. Value for the attribute: ${TARGET_ID} is undefined`
            );
          }

          if (!value) {
            console.error(
              `Failed to report the mutation event. Value for the attribute: ${HTML_ATTRIBUTES_TO_TRACK} is undefined`
            );
          }

          console.log(
            `The ${mutation.attributeName} attribute for the component ${targetId} was modified with the value ${value}`
          );
        }

        try {
          reportPerformanceMetricEvent(analytics, {
            eventName: targetId,
            duration: parseFloat(value),
          });
        } catch (error) {
          if (isDevMode) {
            // eslint-disable-next-line no-console
            console.error(`Failed to report the mutation event`, { event, error });
          }
        }
      }
    }
  };

  const mutationObserver = new MutationObserver(cb);
  return mutationObserver.observe(document, config);
}
