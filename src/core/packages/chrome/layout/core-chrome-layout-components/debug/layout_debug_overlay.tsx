/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { layoutVar, layoutLevels } from '@kbn/core-chrome-layout-constants';

const overlayStyle = css`
  pointer-events: none;
  position: fixed;
  inset: 0;
  z-index: ${layoutLevels.debug};
`;

const rectStyle = css`
  position: absolute;
  border: 2px dashed rgba(0, 153, 255, 0.8);
  background: rgba(0, 153, 255, 0.1);
  color: #0099ff;
  font-size: 12px;
  font-family: monospace;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  pointer-events: none;
`;

const labelStyle = css`
  background: rgba(0, 153, 255, 0.85);
  color: white;
  padding: 2px 6px;
  border-radius: 0 0 4px 0;
  font-size: 11px;
  margin: 0;
  pointer-events: none;
`;

const slots: Array<{ name: string; style: React.CSSProperties }> = [
  {
    name: 'banner',
    style: {
      top: layoutVar('banner.top'),
      left: layoutVar('banner.left'),
      right: layoutVar('banner.right'),
      bottom: layoutVar('banner.bottom'),
      width: layoutVar('banner.width'),
      height: layoutVar('banner.height'),
    },
  },
  {
    name: 'header',
    style: {
      top: layoutVar('header.top'),
      bottom: layoutVar('header.bottom'),
      left: layoutVar('header.left'),
      right: layoutVar('header.right'),
      width: layoutVar('header.width'),
      height: layoutVar('header.height'),
    },
  },
  {
    name: 'navigation',
    style: {
      top: layoutVar('navigation.top'),
      bottom: layoutVar('navigation.bottom'),
      left: layoutVar('navigation.left'),
      right: layoutVar('navigation.right'),
      width: layoutVar('navigation.width'),
      height: layoutVar('navigation.height'),
    },
  },
  {
    name: 'sidebar',
    style: {
      top: layoutVar('sidebar.top'),
      bottom: layoutVar('sidebar.bottom'),
      left: layoutVar('sidebar.left'),
      right: layoutVar('sidebar.right'),
      width: layoutVar('sidebar.width'),
      height: layoutVar('sidebar.height'),
    },
  },
  {
    name: 'application',
    style: {
      top: layoutVar('application.top'),
      bottom: layoutVar('application.bottom'),
      left: layoutVar('application.left'),
      right: layoutVar('application.right'),
      width: layoutVar('application.width'),
      height: layoutVar('application.height'),
    },
  },
  {
    name: 'applicationTopBar',
    style: {
      top: layoutVar('application.topBar.top'),
      bottom: layoutVar('application.topBar.bottom'),
      left: layoutVar('application.topBar.left'),
      right: layoutVar('application.topBar.right'),
      width: layoutVar('application.topBar.width'),
      height: layoutVar('application.topBar.height'),
    },
  },
  {
    name: 'footer',
    style: {
      top: layoutVar('footer.top'),
      bottom: layoutVar('footer.bottom'),
      left: layoutVar('footer.left'),
      right: layoutVar('footer.right'),
      width: layoutVar('footer.width'),
      height: layoutVar('footer.height'),
    },
  },
  {
    name: 'applicationBottomBar',
    style: {
      top: layoutVar('application.bottomBar.top'),
      bottom: layoutVar('application.bottomBar.bottom'),
      left: layoutVar('application.bottomBar.left'),
      right: layoutVar('application.bottomBar.right'),
      width: layoutVar('application.bottomBar.width'),
      height: layoutVar('application.bottomBar.height'),
    },
  },
  {
    name: 'applicationContent',
    style: {
      top: layoutVar('application.content.top'),
      left: layoutVar('application.content.left'),
      right: layoutVar('application.content.right'),
      width: layoutVar('application.content.width'),
      height: layoutVar('application.content.height'),
    },
  },
];

interface LayoutDebugOverlayProps {
  colors?: Partial<Record<string, string>>;
}

const defaultColors: Record<string, string> = {
  banner: '#0099ff',
  header: '#00bfae',
  navigation: '#c837ab',
  sidebar: '#ffd600',
  application: '#4caf50',
  applicationTopBar: '#1976d2',
  applicationBottomBar: '#e65100',
  applicationContent: '#00bcd4',
  footer: '#7c4dff',
};

/**
 * A debug overlay component that visually outlines the main layout slots (banner, header, navigation, sidebar, etc.)
 * using colored rectangles. This is useful for development and debugging to understand the placement and sizing of layout regions.
 *
 * @param props - {@link LayoutDebugOverlayProps} Optional colors to override the default slot colors.
 * @returns The rendered debug overlay as a fixed-position set of rectangles.
 */
export const LayoutDebugOverlay: React.FC<LayoutDebugOverlayProps> = ({ colors = {} }) => {
  const mergedColors = { ...defaultColors, ...colors };
  return (
    <div css={overlayStyle}>
      {slots.map((slot) => {
        const color = mergedColors[slot.name] || Object.values(defaultColors)[0];
        return (
          <div
            key={slot.name}
            css={css([
              rectStyle,
              `
                border-color: ${color};
                background: ${color}1A;
                color: ${color};
              `,
            ])}
            style={slot.style}
          >
            <span css={css([labelStyle, `background: ${color};`])}>{slot.name}</span>
          </div>
        );
      })}
    </div>
  );
};
