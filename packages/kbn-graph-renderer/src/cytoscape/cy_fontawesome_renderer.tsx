/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { EuiIcon } from '@elastic/eui';
import { NodeIconType } from '../types';

export const renderFontIcon = (icon: NodeIconType, color: string, size: number) => {
  const svg = renderToStaticMarkup(
    icon.version === 'fa5' ? (
      <FontAwesomeIcon icon={icon.name} width={size} height={size} color={color} />
    ) : (
      <EuiIcon type={icon.name} color={color} width={size} height={size} />
    )
  );
  return {
    url:
      'data:image/svg+xml,' +
      encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE svg>` + svg),
    width: size,
    height: size,
  };
};
