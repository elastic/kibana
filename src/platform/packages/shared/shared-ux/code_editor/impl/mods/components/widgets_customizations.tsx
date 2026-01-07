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
import { type CSSObject, Global, type GlobalProps } from '@emotion/react';

const suggestWidgetModifierClassName = 'kibanaCodeEditor__suggestWidgetModifier';
const parameterHintsWidgetModifierClassName = 'kibanaCodeEditor__parameterHintsWidgetModifier';

const isEditorUsable = (
  editor: monaco.editor.IStandaloneCodeEditor | null
): editor is monaco.editor.IStandaloneCodeEditor => {
  if (!editor) return false;

  // Monaco exposes `isDisposed()` on the model (`ITextModel`), not on the editor (`IStandaloneCodeEditor`).
  // We defensively check for:
  // - model existence (and not disposed)
  // - a DOM node that is still connected to the document
  //
  // This avoids calling into `getContribution(...)` on editors that have already been disposed
  // during fast navigation/unmount cycles (where the model can still be alive briefly).
  try {
    const model = editor.getModel();
    if (!model || model.isDisposed()) return false;

    const domNode = editor.getDomNode();
    if (!domNode) return false;

    return domNode.isConnected;
  } catch {
    return false;
  }
};

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
    Extract<GlobalProps['styles'], CSSObject>
  >({});
  const headerOffset = useRef(
    'var(--kbn-layout--application-top, var(--euiFixedHeadersOffset, 0px))'
  );

  /**
   * @description Repositioning handlers for widgets of interest, assumes the widget has the the "onDidShow" and "onDidHide" methods,
   * See {@link https://github.com/elastic/kibana/issues/223981 | GitHub issue #223981} for the rationale behind this bug fix implementation
   */
  const registerRepositionHandlers = useCallback(
    (
      widget: monaco.editor.IContentWidget | undefined,
      domNodeGetter: (widget: monaco.editor.IContentWidget) => HTMLElement | null,
      modifierClassName: string
    ) => {
      // @ts-expect-error -- The "onDidShow" and "onDidHide" is not documented so we guard from possible changes in the underlying lib
      if (widget && widget.onDidShow && widget.onDidHide && enableSuggestWidgetRepositioning) {
        let $widgetNode: HTMLElement | null = null;

        // Add the modifier className to the global style modifier class names record
        setGlobalStyleModifierClassNamesRecord((prevStyles) => ({
          ...prevStyles,
          [`.${modifierClassName}`]: {
            visibility: 'hidden !important',
          } as unknown as CSSObject,
        }));

        // add the just declared modifier className on the widget to hide the widget by default
        // so we might be able to correctly position the widget,
        // then make it visible
        ($widgetNode = domNodeGetter(widget))?.classList?.add(modifierClassName);

        let originalTopPosition: string | null = null;

        // @ts-expect-error -- "onDidShow" is defined at this point
        widget.onDidShow(() => {
          if ($widgetNode) {
            originalTopPosition = $widgetNode.style.top;
            $widgetNode.style.top = `max(${originalTopPosition}, calc(${headerOffset.current} + ${euiTheme.size.m}))`;
            $widgetNode.classList.remove(modifierClassName);
          }
        });

        // @ts-expect-error -- "onDidHide" is defined at this point
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
    if (!isEditorUsable(editor)) {
      return;
    }

    // `getContribution(...)` can throw if the editor was disposed between render and effect flush.
    // This can happen on fast unmount/remount cycles (e.g. SPA navigation + theme changes) and
    // should not break the code editor field (or trip its error boundary).
    let parameterHintsWidget: any;
    try {
      // @ts-expect-error -- the "widget" property is not documented but it exists
      parameterHintsWidget = editor.getContribution('editor.controller.parameterHints')?.widget
        ?.value;
    } catch {
      return;
    }

    const $parameterHintsWidget = parameterHintsWidget?.getDomNode?.();

    if (!$parameterHintsWidget) {
      return;
    }

    // Add the modifier className to the global style modifier class names record
    setGlobalStyleModifierClassNamesRecord((prevStyles) => ({
      ...prevStyles,
      [`.${parameterHintsWidgetModifierClassName}`]: {
        zIndex: `${euiTheme.levels.header} !important`,
      } as unknown as CSSObject,
    }));

    ($parameterHintsWidget as ReturnType<monaco.editor.IContentWidget['getDomNode']>).classList.add(
      parameterHintsWidgetModifierClassName
    );
  }, [editor, euiTheme.levels.header]);

  // setup the repositioning handlers for widgets of interest
  useEffect(() => {
    if (!isEditorUsable(editor)) {
      return;
    }

    let suggestWidget: any;
    try {
      // @ts-expect-error -- the "widget" property is not documented but it exists
      suggestWidget = editor.getContribution('editor.contrib.suggestController')?.widget?.value;
    } catch {
      // editor disposed mid-flight
      return;
    }

    registerRepositionHandlers(
      suggestWidget,
      // @ts-expect-error -- this is the way to get the DOM node of the suggest widget,
      // not all widgets adhere to the advertised API
      (widget: monaco.editor.IContentWidget) => widget.element?.domNode,
      suggestWidgetModifierClassName
    );

    customizeParameterHintsWidget();
  }, [editor, registerRepositionHandlers, customizeParameterHintsWidget]);

  return (
    <React.Fragment>
      <Global styles={globalStyleModifierClassNamesRecord} />
      <React.Fragment key="children">{children}</React.Fragment>
    </React.Fragment>
  );
};
