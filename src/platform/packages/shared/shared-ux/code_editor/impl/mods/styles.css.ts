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
  /*
   * String hovers set white-space: pre-wrap inline. "Close (Escape)" then wraps
   * onto the 16px icon and takes the click. The hover is portaled beside the
   * editor, so this rule stays global, and !important is required to beat the
   * inline style.
   */
  .monaco-hover.workbench-hover.compact .hover-contents {
    white-space: nowrap !important;
  }
`;
