/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { css as cssClassName } from '@emotion/css';
import { css as cssReact } from '@emotion/react';

const visStyles = {
  visualize: `
    display: flex;
    flex: 1 1 100%;
    overflow: hidden;
  `,
  visContainer: `
    display: flex;
    flex: 1 1 auto;
    justify-content: center;
    align-items: center;
    text-align: center;
  `,
};

export const visualizeStyle = cssReact(visStyles.visualize);
export const visualizeClassName = cssClassName(visStyles.visualize);

export const visContainerStyle = cssReact(visStyles.visContainer);
export const visContainerClassName = cssClassName(visStyles.visContainer);
