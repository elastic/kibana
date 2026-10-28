/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { css } from '@emotion/react';

/**
 * Global styling overrides to monaco editor,
 * only specify rules that should apply to all Kibana editor instances here
 */
export const globalMonacoStyleOverrides = css`
  // visually center the close button for the find widget
  .monaco-editor .find-widget > .button.codicon-widget-close {
    top: 50% !important;
    transform: translateY(-50%);
  }
`;
