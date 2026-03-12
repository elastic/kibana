/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import type { monaco } from '@kbn/monaco';
import type { UseEuiTheme } from '@elastic/eui';
import { PlaceholderWidget } from '../../utils/placeholder_widget';

export const usePlaceholder = ({
  placeholder,
  euiTheme,
  editor,
  value,
}: {
  placeholder: string | undefined;
  euiTheme: UseEuiTheme['euiTheme'];
  editor: monaco.editor.IStandaloneCodeEditor | null;
  value: string;
}) => {
  useEffect(() => {
    if (!placeholder || !editor) return;

    let placeholderWidget: PlaceholderWidget | null = null;

    const addPlaceholder = () => {
      if (!placeholderWidget) {
        placeholderWidget = new PlaceholderWidget(placeholder, euiTheme, editor);
      }
    };

    const removePlaceholder = () => {
      if (placeholderWidget) {
        placeholderWidget.dispose();
        placeholderWidget = null;
      }
    };

    if (!value) {
      addPlaceholder();
    }

    const onDidChangeContent = editor.getModel()?.onDidChangeContent(() => {
      if (!editor.getModel()?.getValue()) {
        addPlaceholder();
      } else {
        removePlaceholder();
      }
    });

    return () => {
      onDidChangeContent?.dispose();
      removePlaceholder();
    };
  }, [placeholder, value, euiTheme, editor]);
};
