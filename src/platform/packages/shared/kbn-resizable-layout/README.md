# @kbn/resizable-layout

A component for creating resizable layouts containing a fixed width panel and a flexible panel, with support for horizontal and vertical layouts.

## Example

> [!NOTE]  
> For advanced usage see [the example plugin](/examples/resizable_layout_examples/public/application.tsx).

```tsx
import { useIsWithinBreakpoints } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  ResizableLayout,
  ResizableLayoutDirection,
  ResizableLayoutMode,
} from '@kbn/resizable-layout';
import React, { useRef, useState } from 'react';
// Using react-reverse-portal is recommended for complex/heavy layouts to prevent
// re-mounting panel components when the layout switches from resizable to static
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';

export const ResizablePage = () => {
  const [fixedPanelSize, setFixedPanelSize] = useState(500);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [fixedPanelNode] = useState(() =>
    createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } })
  );
  const [flexPanelNode] = useState(() =>
    createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } })
  );

  const isMobile = useIsWithinBreakpoints(['xs']);
  const layoutMode = isMobile ? ResizableLayoutMode.Static : ResizableLayoutMode.Resizable;
  const layoutDirection = isMobile
    ? ResizableLayoutDirection.Vertical
    : ResizableLayoutDirection.Horizontal;

  const fullWidthAndHeightCss = css`
    position: relative;
    width: 100%;
    height: 100%;
  `;
  const panelBaseCss = css`
    ${fullWidthAndHeightCss}
    padding: 20px;
  `;
  const fixedPanelCss = css`
    ${panelBaseCss}
    background-color: rgb(255 0 0 / 30%);
  `;
  const flexPanelCss = css`
    ${panelBaseCss}
    background-color: rgb(0 0 255 / 30%);
  `;

  return (
    <div ref={setContainer} css={fullWidthAndHeightCss}>
      <InPortal node={fixedPanelNode}>
        <div css={fixedPanelCss}>
          This is the fixed width panel. It will remain the same size when resizing the window until
          the flexible panel reaches its minimum size.
        </div>
      </InPortal>
      <InPortal node={flexPanelNode}>
        <div css={flexPanelCss}>
          This is the flexible width panel. It will resize as the window resizes until it reaches
          its minimum size.
        </div>
      </InPortal>
      <ResizableLayout
        mode={layoutMode}
        direction={layoutDirection}
        container={container}
        fixedPanelSize={fixedPanelSize}
        minFixedPanelSize={300}
        minFlexPanelSize={500}
        fixedPanel={<OutPortal node={fixedPanelNode} />}
        flexPanel={<OutPortal node={flexPanelNode} />}
        onFixedPanelSizeChange={setFixedPanelSize}
      />
    </div>
  );
};
```
