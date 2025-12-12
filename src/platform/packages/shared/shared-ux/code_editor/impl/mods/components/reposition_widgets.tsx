/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC, useEffect, useCallback, useRef, type PropsWithChildren } from 'react';
import type { monaco } from '@kbn/monaco';
import { useEuiTheme } from '@elastic/eui';
import { Global } from '@emotion/react';

/**
 *
 */
export const RepositionWidgets: FC<
  PropsWithChildren<{
    editor: monaco.editor.IStandaloneCodeEditor | null;
    enableSuggestWidgetRepositioning: boolean;
  }>
> = ({ children, editor, enableSuggestWidgetRepositioning }) => {
  const { euiTheme } = useEuiTheme();
  const headerOffset = useRef(
    'var(--kbn-layout--application-top, var(--euiFixedHeadersOffset, 0px))'
  );
  const suggestWidgetModifierClassName = 'kibanaCodeEditor__suggestWidgetModifier';
  const parameterHintsWidgetModifierClassName = 'kibanaCodeEditor__parameterHintsWidgetModifier';

  // Only for widgets known to support the "onDidShow" and "onDidHide" events
  const registerRepositionHandlers = useCallback(
    (
      widget: monaco.editor.IContribution['widget'] | undefined,
      domNodeGetter: () => HTMLElement | null,
      modifierClassName: string
    ) => {
      // The "onDidShow" and "onDidHide" is not documented so we guard from possible changes in the underlying lib
      if (widget && widget.onDidShow && widget.onDidHide && enableSuggestWidgetRepositioning) {
        let $widgetNode: HTMLElement | null = null;

        // add a className that hides the widget by default so we might be to correctly position the widget,
        // then make it visible
        ($widgetNode = domNodeGetter(widget))?.classList?.add(modifierClassName);

        let originalTopPosition: string | null = null;

        widget.onDidShow(() => {
          if ($widgetNode) {
            originalTopPosition = $widgetNode.style.top;
            $widgetNode.style.top = `max(${originalTopPosition}, calc(${headerOffset.current} + ${euiTheme.size.m}))`;
            $widgetNode.classList.remove(modifierClassName);
          }
        });

        widget.onDidHide(() => {
          if ($widgetNode) {
            $widgetNode.classList.add(modifierClassName);
            $widgetNode.style.top = originalTopPosition ?? '';
          }
        });
      }
    },
    [enableSuggestWidgetRepositioning, euiTheme.size.m]
  );

  /**
   * handle repositioning for widgets that do not support the "onDidShow" and "onDidHide" events
   * Informed by https://github.com/microsoft/vscode/blob/dc1486be9efc0dd9df05c36bdc49bc1f1c940f4a/src/vs/editor/contrib/parameterHints/browser/parameterHints.ts#L46-L53
   */
  const registerRepositionHandlersForLegacyWidgets = useCallback(
    (
      widget: monaco.editor.IContribution['widget'] | undefined,
      domNodeGetter: () => HTMLElement | null,
      modifierClassName: string
    ) => {
      if (
        widget &&
        widget.model &&
        widget.model.onChangedHints &&
        enableSuggestWidgetRepositioning
      ) {
        let $widgetNode: HTMLElement | null = null;

        // add a className that hides the widget by default so we might be able to correctly position the widget,
        // then make it visible after the fact
        ($widgetNode = domNodeGetter(widget))?.classList?.add(modifierClassName);

        let originalTopPosition: string | null = null;

        widget.model.onChangedHints(() => {
          if (widget.visible) {
            originalTopPosition = $widgetNode.style.top;
            $widgetNode.style.top = `max(${originalTopPosition || 0}, calc(${
              headerOffset.current
            } + ${euiTheme.size.m}))`;
            $widgetNode.classList.remove(modifierClassName);
          } else {
            $widgetNode.classList.add(modifierClassName);
            $widgetNode.style.top = originalTopPosition ?? '';
          }
        });
      }
    },
    [enableSuggestWidgetRepositioning, euiTheme.size.m]
  );

  // setup the repositioning handlers for widgets of interest
  useEffect(() => {
    // See {@link https://github.com/elastic/kibana/issues/223981 | GitHub issue #223981} for the rationale behind this bug fix implementation
    registerRepositionHandlers(
      editor?.getContribution('editor.contrib.suggestController')?.widget?.value,
      (widget: monaco.editor.IContribution['widget']) => widget.element?.domNode,
      suggestWidgetModifierClassName
    );

    // See {@link https://github.com/elastic/kibana/pull/245600 | GitHub issue #245600} for the rationale behind this bug fix implementation
    registerRepositionHandlersForLegacyWidgets(
      editor?.getContribution('editor.controller.parameterHints')?.widget?.value,
      (widget: monaco.editor.IContribution['widget']) => widget.getDomNode(),
      parameterHintsWidgetModifierClassName
    );
  }, [editor, registerRepositionHandlers, registerRepositionHandlersForLegacyWidgets]);

  return (
    <React.Fragment>
      {enableSuggestWidgetRepositioning && (
        <Global
          // @ts-expect-error -- it's necessary that we apply the important modifier
          styles={{
            [`.${suggestWidgetModifierClassName}`]: {
              visibility: 'hidden !important',
            },
            [`.${parameterHintsWidgetModifierClassName}`]: {
              visibility: 'hidden !important',
            },
          }}
        />
      )}
      <React.Fragment>{children}</React.Fragment>
    </React.Fragment>
  );
};
