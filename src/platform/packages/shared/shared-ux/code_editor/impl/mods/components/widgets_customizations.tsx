/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  type FC,
  useEffect,
  useCallback,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import type { monaco } from '@kbn/monaco';
import { useEuiTheme } from '@elastic/eui';
import { Global, type GlobalProps } from '@emotion/react';

const suggestWidgetModifierClassName = 'kibanaCodeEditor__suggestWidgetModifier';
const parameterHintsWidgetModifierClassName = 'kibanaCodeEditor__parameterHintsWidgetModifier';

/**
 * @description helps reposition widgets of interest in the code editor,
 * so they are placed without layering over the header.
 */
export const EditorWidgetsCustomizations: FC<
  PropsWithChildren<{
    editor: monaco.editor.IStandaloneCodeEditor | null;
    enableSuggestWidgetRepositioning: boolean;
  }>
> = ({ children, editor, enableSuggestWidgetRepositioning }) => {
  const { euiTheme } = useEuiTheme();
  const [globalStyleModifierClassNamesRecord, setGlobalStyleModifierClassNamesRecord] = useState<
    GlobalProps['styles']
  >({});
  const headerOffset = useRef(
    'var(--kbn-layout--application-top, var(--euiFixedHeadersOffset, 0px))'
  );

  /**
   * @description Repositioning handlers for widgets of interest, only for widgets known to support the "onDidShow" and "onDidHide" events,
   * See {@link https://github.com/elastic/kibana/issues/223981 | GitHub issue #223981} for the rationale behind this bug fix implementation
   */
  const registerRepositionHandlers = useCallback(
    (
      widget: monaco.editor.IContribution['widget'] | undefined,
      domNodeGetter: () => HTMLElement | null,
      modifierClassName: string
    ) => {
      // The "onDidShow" and "onDidHide" is not documented so we guard from possible changes in the underlying lib
      if (widget && widget.onDidShow && widget.onDidHide && enableSuggestWidgetRepositioning) {
        let $widgetNode: HTMLElement | null = null;

        // Add the modifier className to the global style modifier class names record
        setGlobalStyleModifierClassNamesRecord((prev) => ({
          ...prev,
          [`.${modifierClassName}`]: {
            // @ts-expect-error -- the handling of showing and hiding of the widgets by monaco
            // happens through style attributes hence the need for the important modifier
            visibility: 'hidden !important',
          },
        }));

        // add the just declared modifier className on the widget to hide the widget by default
        // so we might be able to correctly position the widget,
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
   * See {@link https://github.com/elastic/kibana/pull/245600 | GitHub issue #245600} for the rationale behind this bug fix implementation
   */
  const customizeParameterHintsWidget = useCallback(() => {
    const parameterHintsWidget = editor?.getContribution('editor.controller.parameterHints')?.widget
      ?.value;
    const $parameterHintsWidget = parameterHintsWidget?.getDomNode();

    if (parameterHintsWidget) {
      // Add the modifier className to the global style modifier class names record
      setGlobalStyleModifierClassNamesRecord((prev) => ({
        ...prev,
        [`.${parameterHintsWidgetModifierClassName}`]: {
          zIndex: `${euiTheme.levels.header} !important`,
        },
      }));

      $parameterHintsWidget.classList.add(parameterHintsWidgetModifierClassName);
    }
  }, [editor, euiTheme.levels.header]);

  // setup the repositioning handlers for widgets of interest
  useEffect(() => {
    registerRepositionHandlers(
      editor?.getContribution('editor.contrib.suggestController')?.widget?.value,
      (widget: monaco.editor.IContribution['widget']) => widget.element?.domNode,
      suggestWidgetModifierClassName
    );

    customizeParameterHintsWidget();
  }, [editor, registerRepositionHandlers, customizeParameterHintsWidget]);

  return (
    <React.Fragment>
      {enableSuggestWidgetRepositioning && <Global styles={globalStyleModifierClassNamesRecord} />}
      <React.Fragment key="children">{children}</React.Fragment>
    </React.Fragment>
  );
};
