/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useContext, useEffect, useRef } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { UnifiedDataTableContext } from '@kbn/unified-data-table/src/table_context';
import type { TriggerEventReplaySource } from '@kbn/workflows';
import { buildTriggerEventReplayInputs } from './workflow_execute_event_replay_inputs';

interface TriggerEventRunPayloadSelectionSyncProps {
  dataTableRows: DataTableRecord[];
  replaySpaceId: string;
  setValue: (value: string) => void;
  setErrors?: (errors: string | null) => void;
}

/**
 * Renders inside UnifiedDataTable's toolbar (under UnifiedDataTableContext.Provider) so we can
 * mirror checkbox selection into the modal JSON without adding APIs to @kbn/unified-data-table.
 */
export const TriggerEventRunPayloadSelectionSync = ({
  dataTableRows,
  replaySpaceId,
  setValue,
  setErrors,
}: TriggerEventRunPayloadSelectionSyncProps) => {
  const { selectedDocsState } = useContext(UnifiedDataTableContext);
  const selectedStateRef = useRef(selectedDocsState);
  selectedStateRef.current = selectedDocsState;

  const docIdsKey = (selectedDocsState?.docIdsInSelectionOrder ?? []).join('\0');

  useEffect(() => {
    const docIds = selectedStateRef.current?.docIdsInSelectionOrder ?? [];
    if (docIds.length === 0) {
      setValue('');
      setErrors?.(null);
      return;
    }
    const primaryId = docIds[0];
    const record = dataTableRows.find((r) => r.id === primaryId);
    if (!record) {
      setValue('');
      return;
    }
    const source = (record.raw._source ?? {}) as TriggerEventReplaySource;
    setValue(JSON.stringify(buildTriggerEventReplayInputs(source, replaySpaceId), null, 2));
    setErrors?.(null);
  }, [dataTableRows, docIdsKey, replaySpaceId, setErrors, setValue]);

  return null;
};

TriggerEventRunPayloadSelectionSync.displayName = 'TriggerEventRunPayloadSelectionSync';

interface TriggerEventTableSelectionCountSyncProps {
  onSelectionCountChange: (selectedCount: number) => void;
}

/**
 * Reports checkbox selection size to the parent so the run modal can block execution when
 * multiple rows are selected (only a single trigger event is supported).
 */
export const TriggerEventTableSelectionCountSync = ({
  onSelectionCountChange,
}: TriggerEventTableSelectionCountSyncProps) => {
  const { selectedDocsState } = useContext(UnifiedDataTableContext);
  const selectedStateRef = useRef(selectedDocsState);
  selectedStateRef.current = selectedDocsState;

  const docIdsKey = (selectedDocsState?.docIdsInSelectionOrder ?? []).join('\0');

  useEffect(() => {
    const docIds = selectedStateRef.current?.docIdsInSelectionOrder ?? [];
    onSelectionCountChange(docIds.length);
  }, [docIdsKey, onSelectionCountChange]);

  return null;
};

TriggerEventTableSelectionCountSync.displayName = 'TriggerEventTableSelectionCountSync';
