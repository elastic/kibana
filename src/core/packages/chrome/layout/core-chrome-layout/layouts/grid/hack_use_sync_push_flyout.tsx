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

    const callback: MutationCallback = (mutationsList: MutationRecord[]) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          // const newPaddingInlineStart = window.getComputedStyle(targetNode).paddingInlineStart;
          const styleAttribute = targetNode.getAttribute('style') ?? '';

          function parseCSSDeclaration(styleAttr: string) {
            return styleAttr
              .trim()
              .split(';')
              .filter((s) => s !== '')
              .map((declaration) => {
                const colonIndex = declaration.indexOf(':');
                if (colonIndex === -1) {
                  throw new Error('Invalid CSS declaration: no colon found.');
                }

                const property = declaration.slice(0, colonIndex).trim();
                const value = declaration.slice(colonIndex + 1).trim();

                return { property, value };
              });
          }

          const parsedStyle = parseCSSDeclaration(styleAttribute);
          const paddingInline = parsedStyle.find(
            (style) => style.property === 'padding-inline'
          )?.value;
          let paddingInlineStart = parsedStyle.find(
            (style) => style.property === 'padding-inline-start'
          )?.value;
          let paddingInlineEnd = parsedStyle.find(
            (style) => style.property === 'padding-inline-end'
          )?.value;

          const [start, end] = paddingInline?.split(' ') ?? ['', ''];

          paddingInlineStart = paddingInlineStart ?? start;
          paddingInlineEnd = paddingInlineEnd ?? end;

          if (paddingInlineStart) {
            setGlobalCSSVariables({
              [hackEuiPushFlyoutPaddingInlineStart]: paddingInlineStart,
            });
          } else {
            setGlobalCSSVariables({
              [hackEuiPushFlyoutPaddingInlineStart]: null,
            });
          }

          if (paddingInlineEnd) {
            setGlobalCSSVariables({
              [hackEuiPushFlyoutPaddingInlineEnd]: paddingInlineEnd,
            });
          } else {
            setGlobalCSSVariables({
              [hackEuiPushFlyoutPaddingInlineEnd]: null,
            });
          }
        }
      }
    };

    const observer = new MutationObserver(callback);

    observer.observe(targetNode, { attributes: true, attributeFilter: ['style'] });

    return () => {
      observer.disconnect();
    };
  }, [setGlobalCSSVariables]);
}
