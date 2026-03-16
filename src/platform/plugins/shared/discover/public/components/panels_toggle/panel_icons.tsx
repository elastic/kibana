/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { SVGProps } from 'react';

type PanelIconProps = SVGProps<SVGSVGElement>;

export const FieldListShownIcon = (props: PanelIconProps) => (
  <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M0 1c0-.552285.447715-1 1-1h12c.5523 0 1 .447715 1 1v12c0 .5523-.4477 1-1 1H1c-.552285 0-1-.4477-1-1V1Zm13 12V1H5v12h8ZM3.20703 13H4v-.793L1 9.20703v1.58597L3.20703 13ZM4 10.793V9.20703L1 6.20703v1.58594L4 10.793ZM4 7.79297V6.20703l-1.5-1.5L1 3.20703v1.58594L4 7.79297ZM4 4.79297V3.20703L1.79297 1H1v.79297L4 4.79297ZM4 1.79297V1h-.79297L4 1.79297ZM1.79297 13 1 12.207V13h.79297Z"
      fill="#1D2A3E"
    />
  </svg>
);

export const FieldListHiddenIcon = (props: PanelIconProps) => (
  <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M0 1c0-.552285.447715-1 1-1h12c.5523 0 1 .447715 1 1v12c0 .5523-.4477 1-1 1H1c-.552285 0-1-.4477-1-1V1Zm13 12V1H5v12h8ZM4 13V1H1.79297H1v12h3Z"
      fill="#798EAF"
    />
  </svg>
);

export const VizShownIcon = (props: PanelIconProps) => (
  <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M13 0c.5523 0 1 .447715 1 1v12c0 .5523-.4477 1-1 1H1c-.552285 0-1-.4477-1-1V1c0-.552285.447715-1 1-1h12ZM1 13h12V5H1v8ZM1 3.20703V4h.79297l3-3H3.20703L1 3.20703ZM3.20703 4h1.58594l3-3H6.20703l-3 3ZM6.20703 4h1.58594l1.5-1.5L10.793 1H9.20703l-3 3ZM9.20703 4H10.793L13 1.79297V1h-.793L9.20703 4ZM12.207 4H13v-.79297L12.207 4ZM1 1.79297 1.79297 1H1v.79297Z"
      fill="#1D2A3E"
    />
  </svg>
);

export const VizHiddenIcon = (props: PanelIconProps) => (
  <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M13 0c.5523 0 1 .447715 1 1v12c0 .5523-.4477 1-1 1H1c-.552285 0-1-.4477-1-1V1c0-.552285.447715-1 1-1h12ZM1 13h12V5H1v8Zm0-9h12V1.79297V1H1v3Z"
      fill="#798EAF"
    />
    <rect x="1" y="4" width="12" height="1" fill="#798EAF" />
  </svg>
);

export const TableShownIcon = (props: PanelIconProps) => (
  <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M1 14c-.552285 0-1-.4477-1-1V1c0-.552284.447715-1 1-1h12c.5523 0 1 .447716 1 1v12c0 .5523-.4477 1-1 1H1ZM13 1H1v4h12V1Zm0 6.5v-1h-.793L9.20703 13h1.58597L13 7.5Zm-2.207-1H9.20703L6.20703 13h1.58594l3-6.5Zm-3 0H6.20703L3.20703 13h1.58594l3-6.5Zm-3 0H3.20703L1 11.709V13h.79297l3-6.5Zm-2.79883 0H1v2.20898L1.99414 6.5ZM13 10.7129 12.207 13H13v-2.2871Z"
      fill="#1D2A3E"
    />
  </svg>
);

export const TableHiddenIcon = (props: PanelIconProps) => (
  <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M1 14c-.552285 0-1-.4477-1-1V1c0-.552284.447715-1 1-1h12c.5523 0 1 .447716 1 1v12c0 .5523-.4477 1-1 1H1ZM13 1H1v12h12V1Z"
      fill="#798EAF"
    />
    <path d="M13 6H1V5h12v1Z" fill="#798EAF" />
  </svg>
);
