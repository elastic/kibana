/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType } from 'react';
import type { PageDefinition } from './page_app/page_form';

export type { PageDefinition };

export interface PageFormPreviewProps {
  definition: PageDefinition;
}

export interface WorkflowsPagesPluginStart {
  /** The page form for authors. It validates on submit and never runs the workflow. */
  PageFormPreview: ComponentType<PageFormPreviewProps>;
}
