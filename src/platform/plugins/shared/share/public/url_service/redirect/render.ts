/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { render as mount, unmountComponentAtNode } from '@kbn/core-mount-utils-browser';
import type { PageProps } from './components/page';
import { Page } from './components/page';

export const render = (container: HTMLElement, props: PageProps) => {
  mount(React.createElement(Page, props), container);

  return () => {
    unmountComponentAtNode(container);
  };
};
