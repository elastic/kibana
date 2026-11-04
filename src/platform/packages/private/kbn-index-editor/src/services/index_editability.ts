/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { IndexEditorResolution } from '@kbn/esql-types';
import type { IndexEditorIndexMode } from '../types';

/** Why an existing index cannot be opened for editing. */
export type IndexEditabilityReason =
  | 'missing'
  | 'alias'
  | 'dataStream'
  | 'closed'
  | 'frozen'
  | 'routingRequired'
  | 'unsupportedMode'
  | 'sourceDisabled'
  | 'sourceSynthetic';

export type IndexEditabilityVerdict =
  | { editable: true }
  | { editable: false; reason: IndexEditabilityReason };

/**
 * The editor edits a single concrete index. Standard editing targets a plain index (no explicit
 * mode); lookup editing targets a lookup-mode index. Every other explicit mode (e.g. `logsdb`,
 * `time_series`) is out of scope.
 */
const isModeEditable = (mode: string | undefined, indexMode: IndexEditorIndexMode): boolean => {
  if (indexMode === 'lookup') {
    return mode === 'lookup';
  }
  return mode === undefined || mode === 'standard';
};

/**
 * Decides whether an existing index can be opened for editing, given the server-side resolution of
 * its name. Editing requires a concrete, open, standard-or-lookup index.
 */
export const assessIndexEditability = (
  resolution: IndexEditorResolution,
  { indexMode }: { indexMode: IndexEditorIndexMode }
): IndexEditabilityVerdict => {
  if (resolution.kind === 'alias') {
    return { editable: false, reason: 'alias' };
  }
  if (resolution.kind === 'dataStream') {
    return { editable: false, reason: 'dataStream' };
  }
  if (resolution.kind !== 'index') {
    return { editable: false, reason: 'missing' };
  }
  if (resolution.closed) {
    return { editable: false, reason: 'closed' };
  }
  if (resolution.frozen) {
    return { editable: false, reason: 'frozen' };
  }
  // Applies to any mode: the editor writes by `_id` without routing, which a routing-required
  // index rejects.
  if (resolution.routingRequired) {
    return { editable: false, reason: 'routingRequired' };
  }
  if (!isModeEditable(resolution.mode, indexMode)) {
    return { editable: false, reason: 'unsupportedMode' };
  }
  // A disabled `_source` leaves nothing to read back for editing; a synthetic `_source` is
  // reconstructed on read, so writing it back could silently change stored values.
  if (resolution.sourceDisabled) {
    return { editable: false, reason: 'sourceDisabled' };
  }
  if (resolution.sourceSynthetic) {
    return { editable: false, reason: 'sourceSynthetic' };
  }
  return { editable: true };
};

/** User-facing title explaining why an index cannot be opened for editing. */
export const getIndexEditabilityErrorTitle = (
  reason: IndexEditabilityReason,
  indexName: string
): string => {
  switch (reason) {
    case 'missing':
      return i18n.translate('indexEditor.editability.missing', {
        defaultMessage: 'Index "{indexName}" does not exist anymore.',
        values: { indexName },
      });
    case 'alias':
      return i18n.translate('indexEditor.editability.alias', {
        defaultMessage: '"{indexName}" is an alias. Open the underlying index to edit it.',
        values: { indexName },
      });
    case 'dataStream':
      return i18n.translate('indexEditor.editability.dataStream', {
        defaultMessage: '"{indexName}" is a data stream and cannot be edited here.',
        values: { indexName },
      });
    case 'closed':
      return i18n.translate('indexEditor.editability.closed', {
        defaultMessage: 'Index "{indexName}" is closed. Reopen it before editing.',
        values: { indexName },
      });
    case 'frozen':
      return i18n.translate('indexEditor.editability.frozen', {
        defaultMessage: 'Index "{indexName}" is frozen and cannot be edited here.',
        values: { indexName },
      });
    case 'routingRequired':
      return i18n.translate('indexEditor.editability.routingRequired', {
        defaultMessage: 'Index "{indexName}" requires custom routing, which cannot be edited here.',
        values: { indexName },
      });
    case 'unsupportedMode':
      return i18n.translate('indexEditor.editability.unsupportedMode', {
        defaultMessage: 'Index "{indexName}" uses an index mode that cannot be edited here.',
        values: { indexName },
      });
    case 'sourceDisabled':
      return i18n.translate('indexEditor.editability.sourceDisabled', {
        defaultMessage: 'Index "{indexName}" has _source disabled and cannot be edited here.',
        values: { indexName },
      });
    case 'sourceSynthetic':
      return i18n.translate('indexEditor.editability.sourceSynthetic', {
        defaultMessage: 'Index "{indexName}" uses synthetic _source and cannot be edited here.',
        values: { indexName },
      });
  }
};
