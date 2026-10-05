/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import { isPageTrigger } from '@kbn/workflows';
import type { WorkflowYaml } from '@kbn/workflows';

/** A new opaque page id. Random, so it reveals nothing about the workflow. */
export const createPageKey = (): string => uuidv4();

/**
 * Gives a workflow its page key on the first save that has a page trigger, and keeps
 * it on every save after. The key lives on the workflow document, never in the YAML,
 * so clone and import (which create new documents) always get a new page URL.
 */
export const withPageKey = <T extends { definition: WorkflowYaml | null; pageKey?: string }>(
  document: T
): T =>
  document.pageKey || !document.definition?.triggers?.some(isPageTrigger)
    ? document
    : { ...document, pageKey: createPageKey() };
