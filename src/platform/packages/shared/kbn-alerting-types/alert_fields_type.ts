/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldDescriptorWithMetadata } from '@kbn/rule-registry-plugin/common/types';

export interface AlertField extends FieldDescriptorWithMetadata {
  category: string;
}

export interface AlertFieldCategory {
  name: string;
  fields: Record<string, AlertField>;
  title?: string;
  description?: string;
  group?: number;
  root?: boolean;
  short?: string;
}

export type AlertFieldCategoriesMap = Record<string, AlertFieldCategory>;
