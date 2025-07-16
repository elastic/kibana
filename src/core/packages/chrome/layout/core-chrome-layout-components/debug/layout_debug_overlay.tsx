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

const overlayStyle = css`
  pointer-events: none;
  position: fixed;
  inset: 0;
  z-index: 9999;
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
      top: 'var(--kbn-layout--banner-top, 0)',
      left: 'var(--kbn-layout--banner-left, 0)',
      width: 'var(--kbn-layout--banner-width, 100vw)',
      height: 'var(--kbn-layout--banner-height, 0)',
    },
  },
  {
    name: 'header',
    style: {
      top: 'var(--kbn-layout--header-top, 0)',
      left: 'var(--kbn-layout--header-left, 0)',
      width: 'var(--kbn-layout--header-width, 100vw)',
      height: 'var(--kbn-layout--header-height, 0)',
    },
  },
  {
    name: 'navigation',
    style: {
      top: 'var(--kbn-layout--navigation-top, 0)',
      left: '0',
      width: 'var(--kbn-layout--navigation-width, 0)',
      height: 'var(--kbn-layout--navigation-height, 0)',
    },
  },
  {
    name: 'sidebar',
    style: {
      top: 'var(--kbn-layout--sidebar-top, 0)',
      right: '0',
      width: 'var(--kbn-layout--sidebar-width, 0)',
      height: 'var(--kbn-layout--sidebar-height, 0)',
    },
  },
  {
    name: 'sidebarPanel',
    style: {
      top: 'var(--kbn-layout--sidebar-top, 0)',
      right: 'var(--kbn-layout--sidebar-width, 0)',
      width: 'var(--kbn-layout--sidebar-panel-width, 0)',
      height: 'var(--kbn-layout--sidebar-height, 0)',
    },
  },
  {
    name: 'application',
    style: {
      top: 'var(--kbn-layout--application-top, 0)',
      left: 'var(--kbn-layout--application-left, 0)',
      right: 'var(--kbn-layout--application-right, 0)',
      width: 'var(--kbn-layout--application-width, 0)',
      height: 'var(--kbn-layout--application-height, 0)',
    },
  },
  {
    name: 'applicationTopBar',
    style: {
      top: 'var(--kbn-application--top-bar-top, 0)',
      left: 'var(--kbn-application--top-bar-left, 0)',
      right: 'var(--kbn-application--top-bar-right, 0)',
      width: 'var(--kbn-application--top-bar-width, 0)',
      height: 'var(--kbn-application--top-bar-height, 0)',
    },
  },
  {
    name: 'footer',
    style: {
      top: 'var(--kbn-layout--footer-top, 0)',
      left: 'var(--kbn-layout--footer-left, 0)',
      width: 'var(--kbn-layout--footer-width, 0)',
      height: 'var(--kbn-layout--footer-height, 0)',
    },
  },
  {
    name: 'applicationBottomBar',
    style: {
      bottom: 'var(--kbn-application--bottom-bar-bottom, 0)',
      left: 'var(--kbn-application--bottom-bar-left, 0)',
      right: 'var(--kbn-application--bottom-bar-right, 0)',
      width: 'var(--kbn-application--bottom-bar-width, 0)',
      height: 'var(--kbn-application--bottom-bar-height, 0)',
    },
  },
  {
    name: 'applicationContent',
    style: {
      top: 'var(--kbn-application--content-top, 0)',
      left: 'var(--kbn-application--content-left, 0)',
      right: 'var(--kbn-application--content-right, 0)',
      width: 'var(--kbn-application--content-width, 0)',
      height: 'var(--kbn-application--content-height, 0)',
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
  sidebarPanel: '#ff3d00',
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
