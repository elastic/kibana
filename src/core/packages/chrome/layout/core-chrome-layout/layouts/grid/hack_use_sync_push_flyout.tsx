/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { useEuiThemeCSSVariables } from '@elastic/eui';

export const hackEuiPushFlyoutPaddingInlineEnd = '--eui-push-flyout-padding-inline-end';
export const hackEuiPushFlyoutPaddingInlineStart = '--eui-push-flyout-padding-inline-start';

/**
 * This is definitely a hack for experimental purposes.
 * Currently, EUI push flyouts visually push the content to the right by adding a padding to the body
 * This hook listens to styles changes on the body and updates a CSS variable that is used to push the workspace content
 * https://github.com/elastic/eui/issues/8820
 */
export function useHackSyncPushFlyout() {
  const { setGlobalCSSVariables } = useEuiThemeCSSVariables();

  useEffect(() => {
    const targetNode = document.body;

    const callback = (mutations?: MutationRecord[]) => {
      mutations?.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const oldValue = mutation.oldValue;
          const newValue = (mutation.target as HTMLElement).getAttribute(mutation.attributeName);
          console.log('HackSyncPushFlyout: Style attribute changed: ', oldValue, '->', newValue);
        }
      });
      // If the style attribute has changed, we need to re-evaluate the padding values

      const paddingInline = targetNode.style.paddingInline;
      let paddingInlineStart = targetNode.style.paddingInlineStart;
      let paddingInlineEnd = targetNode.style.paddingInlineEnd;

      const [start, end] = paddingInline?.split(' ') ?? ['', ''];

      paddingInlineStart = paddingInlineStart || start || '0px';
      paddingInlineEnd = paddingInlineEnd || end || '0px';

      console.log(
        'HackSyncPushFlyout:',
        JSON.stringify({
          paddingInlineStart,
          paddingInlineEnd,
        })
      );

      setGlobalCSSVariables({
        [hackEuiPushFlyoutPaddingInlineStart]: paddingInlineStart,
        [hackEuiPushFlyoutPaddingInlineEnd]: paddingInlineEnd,
      });
    };

    const observer = new MutationObserver(callback);

    observer.observe(targetNode, {
      attributes: true,
      attributeFilter: ['style'],
      attributeOldValue: true,
    });

    // Initial call to set the CSS variables based on the current style
    callback();

    return () => {
      observer.disconnect();
    };
  }, [setGlobalCSSVariables]);
}
