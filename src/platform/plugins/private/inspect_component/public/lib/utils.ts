/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactHTML } from 'react';
import { EXCLUDED_COMPONENT_TYPES, EUI_COMPONENTS_DOCS_MAP, HTML_TAGS } from './constants';

export const isEui = (type: string) => type.startsWith('Eui');

export const isHtmlTag = (type: string) => HTML_TAGS.includes(type as keyof ReactHTML);

export const isExcludedComponent = (type: string) =>
  EXCLUDED_COMPONENT_TYPES.some((t) => type.includes(t));

export const isEuiMainComponent = (type: string) => EUI_COMPONENTS_DOCS_MAP.get(type) !== undefined;
