/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import type { AppMountParameters } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import React, { ReactNode, useState } from 'react';
import ReactDOM from 'react-dom';
import { useIsWithinBreakpoints } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  ResizableLayout,
  ResizableLayoutDirection,
  ResizableLayoutMode,
} from '@kbn/resizable-layout';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';

const ResizableSection = ({
  direction,
  initialFixedPanelSize,
  minFixedPanelSize,
  minFlexPanelSize,
  fixedPanelColor,
  flexPanelColor,
  fixedPanelContent,
  flexPanelContent,
}: {
  direction: ResizableLayoutDirection;
  initialFixedPanelSize: number;
  minFixedPanelSize: number;
  minFlexPanelSize: number;
  fixedPanelColor: string;
  flexPanelColor: string;
  fixedPanelContent: ReactNode;
  flexPanelContent: ReactNode;
}) => {
  const [fixedPanelSize, setFixedPanelSize] = useState(initialFixedPanelSize);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [fixedPanelNode] = useState(() =>
    createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } })
  );
  const [flexPanelNode] = useState(() =>
    createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } })
  );

  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const layoutMode = isMobile ? ResizableLayoutMode.Static : ResizableLayoutMode.Resizable;
  const layoutDirection = isMobile ? ResizableLayoutDirection.Vertical : direction;

  const fullWidthAndHeightCss = css`
    position: relative;
    width: 100%;
    height: 100%;
  `;
  const panelBaseCss = css`
    ${fullWidthAndHeightCss}
    padding: 20px;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  const fixedPanelCss = css`
    ${panelBaseCss}
    background-color: ${fixedPanelColor};
  `;
  const flexPanelCss = css`
    ${panelBaseCss}
    background-color: ${flexPanelColor};
  `;

  return (
    <div ref={setContainer} css={fullWidthAndHeightCss}>
      <InPortal node={fixedPanelNode}>
        <div css={fixedPanelCss}>{fixedPanelContent}</div>
      </InPortal>
      <InPortal node={flexPanelNode}>
        <div css={flexPanelCss}>{flexPanelContent}</div>
      </InPortal>
      <ResizableLayout
        mode={layoutMode}
        direction={layoutDirection}
        container={container}
        fixedPanelSize={fixedPanelSize}
        minFixedPanelSize={minFixedPanelSize}
        minFlexPanelSize={minFlexPanelSize}
        fixedPanel={<OutPortal node={fixedPanelNode} />}
        flexPanel={<OutPortal node={flexPanelNode} />}
        onFixedPanelSizeChange={setFixedPanelSize}
      />
    </div>
  );
};

export const renderApp = ({ element, theme$ }: AppMountParameters) => {
  ReactDOM.render(
    <I18nProvider>
      <KibanaThemeProvider theme={{ theme$ }}>
        <div
          css={css`
            height: calc(100vh - var(--euiFixedHeadersOffset, 0));
          `}
        >
          <ResizableSection
            direction={ResizableLayoutDirection.Horizontal}
            initialFixedPanelSize={500}
            minFixedPanelSize={300}
            minFlexPanelSize={500}
            fixedPanelColor="#16E0BD"
            flexPanelColor="#89A6FB"
            fixedPanelContent={
              <ResizableSection
                direction={ResizableLayoutDirection.Vertical}
                initialFixedPanelSize={200}
                minFixedPanelSize={100}
                minFlexPanelSize={200}
                fixedPanelColor="#E3655B"
                flexPanelColor="#FDCA40"
                fixedPanelContent="Sidebar Header"
                flexPanelContent="Sidebar Body"
              />
            }
            flexPanelContent={
              <ResizableSection
                direction={ResizableLayoutDirection.Vertical}
                initialFixedPanelSize={300}
                minFixedPanelSize={200}
                minFlexPanelSize={300}
                fixedPanelColor="#FFA0AC"
                flexPanelColor="#F6F740"
                fixedPanelContent="Main Body Header"
                flexPanelContent={
                  <ResizableSection
                    direction={ResizableLayoutDirection.Horizontal}
                    initialFixedPanelSize={400}
                    minFixedPanelSize={200}
                    minFlexPanelSize={200}
                    fixedPanelColor="#78C3FB"
                    flexPanelColor="#EF709D"
                    fixedPanelContent="Main Body Left"
                    flexPanelContent="Main Body Right"
                  />
                }
              />
            }
          />
        </div>
      </KibanaThemeProvider>
    </I18nProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
