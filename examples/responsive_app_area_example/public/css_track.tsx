/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBottomBar,
  EuiButton,
  EuiButtonIcon,
  EuiCode,
  EuiCodeBlock,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHideFor,
  EuiShowFor,
  EuiText,
  EuiToolTip,
  euiMaxBreakpoint,
  useEuiTheme,
} from '@elastic/eui';
import { Box, Demo, Step, SubSection } from './demo';
import { isBelow } from './mode';
import type { Sees } from './what_eui_sees';

const HOW_IT_WORKS = `<EuiProvider breakpointContainer>

euiMaxBreakpoint(euiThemeContext, 'm')
// before: @media only screen and (max-width: 767px)
// after:  @container euiBreakpointContainer (max-width: 767px)`;

export const CssTrack = ({ sees }: { sees: Sees }) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const [isBottomBarOpen, setIsBottomBarOpen] = useState(false);

  const gridStyles = css`
    display: grid;
    gap: ${euiTheme.size.s};
    grid-template-columns: repeat(3, 1fr);
  `;
  const ownGridStyles = css`
    ${gridStyles}
    ${euiMaxBreakpoint(euiThemeContext, 'l')} {
      grid-template-columns: 1fr;
    }
  `;
  const rawGridStyles = css`
    ${gridStyles}
    @media only screen and (max-width: ${euiTheme.breakpoint.l - 1}px) {
      grid-template-columns: 1fr;
    }
  `;

  const cssBelowM = isBelow(sees.css, 'm');
  const jsBelowM = isBelow(sees.js, 'm');

  return (
    <Step
      title="CSS track"
      description="EUI styles follow the space the app gets. This is most of the visible fix: flex groups, grids and every style written with the EUI breakpoint mixins."
    >
      <SubSection title="How it works">
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem>
            <EuiCodeBlock language="tsx" fontSize="s" paddingSize="m">
              {HOW_IT_WORKS}
            </EuiCodeBlock>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <ul>
                <li>
                  The breakpoint mixins emit a container query instead of a media query. Nothing
                  changes at call sites.
                </li>
                <li>
                  EUI global styles make <EuiCode>body</EuiCode> and every{' '}
                  <EuiCode>[data-eui-breakpoint-container]</EuiCode> element a container.
                  chrome-layout marks the app area.
                </li>
                <li>
                  The browser resolves the nearest container from the DOM, so no React root has to
                  say where it lives. Portaled flyouts and the header resolve to{' '}
                  <EuiCode>body</EuiCode>, which equals the window.
                </li>
              </ul>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </SubSection>

      <SubSection title="What it fixes">
        <EuiFlexGrid columns={3} gutterSize="l">
          <Demo
            title="Flex group"
            kind="CSS"
            now={cssBelowM ? 'stacked' : 'row'}
            description="EuiFlexGroup stacks its items below m."
          >
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <Box>One</Box>
              </EuiFlexItem>
              <EuiFlexItem>
                <Box>Two</Box>
              </EuiFlexItem>
              <EuiFlexItem>
                <Box>Three</Box>
              </EuiFlexItem>
            </EuiFlexGroup>
          </Demo>

          <Demo
            title="Flex grid"
            kind="CSS"
            now={cssBelowM ? '1 column' : '3 columns'}
            description="EuiFlexGrid drops to a single column below m."
          >
            <EuiFlexGrid columns={3} gutterSize="s">
              <EuiFlexItem>
                <Box>One</Box>
              </EuiFlexItem>
              <EuiFlexItem>
                <Box>Two</Box>
              </EuiFlexItem>
              <EuiFlexItem>
                <Box>Three</Box>
              </EuiFlexItem>
            </EuiFlexGrid>
          </Demo>

          <Demo
            title="Your own styles"
            kind="CSS"
            now={isBelow(sees.css, 'l') ? '1 column' : '3 columns'}
            description={
              <>
                Styles written with <EuiCode>euiMaxBreakpoint</EuiCode> follow the same width. This
                grid collapses below l.
              </>
            }
          >
            <div css={ownGridStyles}>
              <Box>One</Box>
              <Box>Two</Box>
              <Box>Three</Box>
            </div>
          </Demo>
        </EuiFlexGrid>
      </SubSection>

      <SubSection title="Issues">
        <EuiFlexGrid columns={3} gutterSize="l">
          <Demo
            title="CSS and JS disagree"
            now={cssBelowM === jsBelowM ? 'agree' : 'disagree'}
            description="JS breakpoints keep the window until the JS track lands. Shrink the app area to s in CSS mode: the boxes stack, but the buttons keep their labels."
          >
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <Box>CSS</Box>
              </EuiFlexItem>
              <EuiFlexItem>
                <Box>CSS</Box>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup
              gutterSize="s"
              responsive={false}
              css={css({ marginTop: euiTheme.size.s })}
            >
              {(['refresh', 'share'] as const).map((iconType) => (
                <EuiFlexItem grow={false} key={iconType}>
                  <EuiHideFor sizes={['xs', 's']}>
                    <EuiButton size="s" iconType={iconType}>
                      JS label
                    </EuiButton>
                  </EuiHideFor>
                  <EuiShowFor sizes={['xs', 's']}>
                    <EuiToolTip content={iconType} disableScreenReaderOutput>
                      <EuiButtonIcon display="base" iconType={iconType} aria-label={iconType} />
                    </EuiToolTip>
                  </EuiShowFor>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </Demo>

          <Demo
            title="Raw @media ignores it"
            now={isBelow(sees.window, 'l') ? '1 column' : '3 columns'}
            description={
              <>
                The same grid as &quot;Your own styles&quot;, written with a raw{' '}
                <EuiCode>@media</EuiCode> query. It keeps following the window until it&apos;s
                migrated to the mixins.
              </>
            }
          >
            <div css={rawGridStyles}>
              <Box>One</Box>
              <Box>Two</Box>
              <Box>Three</Box>
            </div>
          </Demo>

          <Demo
            title="Containment check"
            now={isBottomBarOpen ? 'open' : 'closed'}
            description={
              <>
                A container is the containing block for fixed elements inside it. This{' '}
                <EuiCode>EuiBottomBar</EuiCode> renders in place, without a portal. Open it and
                compare its position across modes.
              </>
            }
          >
            <EuiButton size="s" onClick={() => setIsBottomBarOpen((isOpen) => !isOpen)}>
              {isBottomBarOpen ? 'Close bottom bar' : 'Open bottom bar'}
            </EuiButton>
          </Demo>
        </EuiFlexGrid>
      </SubSection>

      {isBottomBarOpen && (
        <EuiBottomBar usePortal={false}>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">Bottom bar rendered inside the app area</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton size="s" color="text" onClick={() => setIsBottomBarOpen(false)}>
                Close
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiBottomBar>
      )}
    </Step>
  );
};
