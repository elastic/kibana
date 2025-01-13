/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';
import { IconSimpleWrapper } from '../icon_simple_wrapper';

export const IconTriangle = (props: Omit<EuiIconProps, 'type'>) => (
  <IconSimpleWrapper {...props}>
    <path d="M3.373 3.079c-.391.062-.637.158-.88.342-.545.415-.577 1.146-.087 1.979.174.296 3.984 6.347 4.164 6.613.32.474.755.838 1.117.937a1.7 1.7 0 0 0 .596.021c.138-.032.341-.126.49-.226.202-.135.523-.478.713-.762.378-.563 4.084-6.475 4.211-6.716.385-.733.368-1.339-.051-1.757-.168-.168-.437-.307-.767-.395l-.226-.06L8.12 3.05c-3.567-.004-4.579.002-4.747.029m9.267 1.004c.208.058.317.121.335.194.022.086-.029.259-.141.482-.129.258-4.174 6.679-4.327 6.87-.264.328-.441.419-.63.323-.116-.059-.33-.275-.454-.459-.276-.405-4.148-6.585-4.234-6.758a.93.93 0 0 1-.117-.364l-.011-.153.103-.053c.094-.048.288-.095.503-.121.044-.006 2.048-.008 4.453-.006 3.853.003 4.391.009 4.52.045" />{' '}
  </IconSimpleWrapper>
);
