/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  ResizableLayout,
  ResizableLayoutDirection,
  ResizableLayoutMode,
} from '@kbn/resizable-layout';
import React, { useState, type ReactNode } from 'react';

/** First full-height editor layout: editor on the left, the rest of Discover on the right. */
export const DiscoverEditorFullHeightLayout = ({
  editorPanel,
  mainPanel,
}: {
  editorPanel: ReactNode;
  mainPanel: ReactNode;
}) => {
  const { euiTheme } = useEuiTheme();
  const minEditorWidth = euiTheme.base * 20;
  const defaultEditorWidth = euiTheme.base * 32;
  const minMainPanelWidth = euiTheme.base * 24;
  const [editorWidth, setEditorWidth] = useState(defaultEditorWidth);

  return (
    <ResizableLayout
      css={css({ height: '100%', minHeight: 0 })}
      mode={ResizableLayoutMode.Resizable}
      direction={ResizableLayoutDirection.Horizontal}
      fixedPanelSize={editorWidth}
      minFixedPanelSize={minEditorWidth}
      minFlexPanelSize={minMainPanelWidth}
      fixedPanel={editorPanel}
      flexPanel={mainPanel}
      data-test-subj="discoverEditorFullHeightLayout"
      onFixedPanelSizeChange={setEditorWidth}
      resizeButtonCss={css({
        // The ES|QL editor stacks above surrounding content. Keep this handle above it
        // so the separator stays continuous and can be dragged along the editor.
        zIndex: euiTheme.levels.flyout + 1,
      })}
    />
  );
};
