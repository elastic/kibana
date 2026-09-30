/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import { isMap, isSeq, parseDocument } from 'yaml';
import { isPageTrigger } from '@kbn/workflows';
import type { WorkflowYaml } from '@kbn/workflows';

export const PAGE_ID_KEY = 'page-id';

interface ReconcilePageIdsParams {
  yaml: string;
  definition: WorkflowYaml | null | undefined;
  /** The stored definition before this save; its IDs are reused when the incoming YAML omits them. */
  previousDefinition?: WorkflowYaml | null;
  /** Clone and import: every page gets a new ID so two workflows never answer the same URL. */
  regenerate?: boolean;
}

const getPageIds = (definition: WorkflowYaml | null | undefined): string[] =>
  (definition?.triggers ?? [])
    .filter(isPageTrigger)
    .map((trigger) => trigger[PAGE_ID_KEY])
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

/**
 * Gives every `type: page` trigger a stable `page-id`, the key of its public URL.
 *
 * Mirrors n8n's `webhookId`: assigned once and kept across edits. When the incoming
 * YAML lacks an ID (for example an editor that did not reload after the first save),
 * the stored ID at the same position is reused, so saving never moves the URL.
 * The ID is written into both the YAML and the parsed definition.
 */
export const reconcilePageIds = ({
  yaml,
  definition,
  previousDefinition,
  regenerate = false,
}: ReconcilePageIdsParams): { yaml: string; definition: WorkflowYaml | null | undefined } => {
  const document = parseDocument(yaml);
  const triggers = document.get('triggers', true);
  if (!isSeq(triggers)) {
    return { yaml, definition };
  }

  const previousIds = getPageIds(previousDefinition);
  const assigned: string[] = [];
  let changed = false;

  for (const item of triggers.items) {
    if (isMap(item) && item.get('type') === 'page') {
      const current = item.get(PAGE_ID_KEY);
      const hasCurrent = typeof current === 'string' && current.length > 0;
      const next = regenerate
        ? uuidv4()
        : hasCurrent
        ? current
        : previousIds[assigned.length] ?? uuidv4();
      if (next !== current) {
        item.set(PAGE_ID_KEY, next);
        changed = true;
      }
      assigned.push(next);
    }
  }

  if (!changed) {
    return { yaml, definition };
  }

  let index = 0;
  const nextDefinition = definition
    ? {
        ...definition,
        triggers: definition.triggers.map((trigger) =>
          isPageTrigger(trigger) ? { ...trigger, [PAGE_ID_KEY]: assigned[index++] } : trigger
        ),
      }
    : definition;

  return { yaml: document.toString(), definition: nextDefinition };
};
