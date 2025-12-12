/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC, useEffect, type PropsWithChildren } from 'react';
import type { monaco } from '@kbn/monaco';
import { useEuiTheme } from '@elastic/eui';
import { Global } from '@emotion/react';

/**
 * @description See {@link https://github.com/elastic/kibana/issues/223981 | GitHub issue #223981} for the rationale behind this bug fix implementation
 */
export const RepositionSuggestionWidget: FC<
  PropsWithChildren<{
    editor: monaco.editor.IStandaloneCodeEditor | null;
    enableSuggestWidgetRepositioning: boolean;
  }>
> = ({ children, editor, enableSuggestWidgetRepositioning }) => {
  const { euiTheme } = useEuiTheme();
  const suggestWidgetModifierClassName = 'kibanaCodeEditor__suggestWidgetModifier';

  useEffect(() => {
    // @ts-expect-errors -- "widget" is not part of the TS interface but does exist
    const suggestionWidget = editor?.getContribution('editor.contrib.suggestController')?.widget
      ?.value;
    // The "onDidShow" and "onDidHide" is not documented so we guard from possible changes in the underlying lib
    if (
      suggestionWidget &&
      suggestionWidget.onDidShow &&
      suggestionWidget.onDidHide &&
      enableSuggestWidgetRepositioning
    ) {
      let $suggestWidgetNode: HTMLElement | null = null;

      // add a className that hides the suggestion widget by default so we might be to correctly position the suggestion widget,
      // then make it visible
      ($suggestWidgetNode = suggestionWidget.element?.domNode)?.classList?.add(
        suggestWidgetModifierClassName
      );

      let originalTopPosition: string | null = null;

      suggestionWidget.onDidShow(() => {
        if ($suggestWidgetNode) {
          originalTopPosition = $suggestWidgetNode.style.top;
          const headerOffset = `var(--kbn-layout--application-top, var(--euiFixedHeadersOffset, 0px))`;
          $suggestWidgetNode.style.top = `max(${originalTopPosition}, calc(${headerOffset} + ${euiTheme.size.m}))`;
          $suggestWidgetNode.classList.remove(suggestWidgetModifierClassName);
        }
      });
      suggestionWidget.onDidHide(() => {
        if ($suggestWidgetNode) {
          $suggestWidgetNode.classList.add(suggestWidgetModifierClassName);
          $suggestWidgetNode.style.top = originalTopPosition ?? '';
        }
      });
    }
  }, [editor, euiTheme.size.m, enableSuggestWidgetRepositioning]);

  return (
    <React.Fragment>
      {enableSuggestWidgetRepositioning && (
        <Global
          // @ts-expect-error -- it's necessary that we apply the important modifier
          styles={{
            [`.${suggestWidgetModifierClassName}`]: {
              visibility: 'hidden !important',
            },
          }}
        />
      )}
      <React.Fragment>{children}</React.Fragment>
    </React.Fragment>
  );
};
