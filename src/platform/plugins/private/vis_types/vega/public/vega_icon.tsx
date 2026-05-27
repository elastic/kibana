/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import type { IconType } from '@elastic/eui';

import { vegaVisType } from './vega_type';

export const VegaIcon: IconType = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 303 251" fill="currentColor" {...props}>
    <title>{vegaVisType.titleInWizard}</title>
    <path d="M.707.5h84l41.5 115.5-30 114.5 81.5-230h84.5l39.5 84h-58.5l19-84-88 250h-85L.707.5Z" />
    <path d="m262.207.5-88 250h-85L.707.5h84l41.5 115.5-30 114.5 81.5-230h84.5Zm0 0-19 84h58.5l-39.5-84Z" />
  </svg>
);
