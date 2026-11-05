/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitFor } from '@testing-library/react';
import { httpServiceMock, notificationServiceMock } from '@kbn/core/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { EDIT_INDEX_CONTENT_TRIGGER_ID } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { EditIndexContentContext } from '@kbn/index-editor';
import type { DataTableRecord } from '@kbn/discover-utils';
import {
  MAX_BULK_EDIT_DOCUMENTS,
  createEditSelectedDocumentsBulkAction,
} from './edit_selected_documents_bulk_action';

const INDEX = 'customers-2';

// Selection holds table-record ids (`id`), distinct from the Elasticsearch `_id` in `raw`.
const makeRecord = (id: string, raw: Record<string, unknown>): DataTableRecord => ({
  id,
  raw,
  flattened: raw,
});

const recordA = makeRecord('t1', { _id: 'docA', _index: INDEX });
const recordB = makeRecord('t2', { _id: 'docB', _index: INDEX });

const setup = ({
  isEsqlMode = false,
  canWrite = true,
  records = [recordA, recordB],
}: { isEsqlMode?: boolean; canWrite?: boolean; records?: DataTableRecord[] } = {}) => {
  const http = httpServiceMock.createStartContract();
  http.get.mockResolvedValue({ [INDEX]: { write: canWrite } });
  const notifications = notificationServiceMock.createStartContract();
  const uiActions = uiActionsPluginMock.createStartContract();
  const onEdited = jest.fn();

  const recordsById = new Map(records.map((record) => [record.id, record]));
  const getRecordsByIds = (ids: string[]) =>
    ids.map((id) => recordsById.get(id)).filter((record): record is DataTableRecord => !!record);

  const action = createEditSelectedDocumentsBulkAction({
    isEsqlMode,
    getRecordsByIds,
    http,
    notifications,
    uiActions,
    onEdited,
  });

  return { action, http, notifications, uiActions, onEdited };
};

describe('createEditSelectedDocumentsBulkAction', () => {
  describe('isAvailable', () => {
    it('is available for a multi-row selection of editable documents', () => {
      const { action } = setup();
      expect(action.isAvailable?.({ selectedDocIds: ['t1', 't2'] })).toBe(true);
    });

    it('is hidden for a single-row selection (handled by the per-row pencil)', () => {
      const { action } = setup();
      expect(action.isAvailable?.({ selectedDocIds: ['t1'] })).toBe(false);
    });

    it('is hidden when any selected row is not editable (e.g. a remote index)', () => {
      const remoteRecord = makeRecord('t3', { _id: 'docC', _index: 'my_remote:customers-2' });
      const { action } = setup({ records: [recordA, remoteRecord] });
      expect(action.isAvailable?.({ selectedDocIds: ['t1', 't3'] })).toBe(false);
    });
  });

  describe('rendering', () => {
    it('labels the action "Edit selected documents" in data view mode', () => {
      const { action } = setup({ isEsqlMode: false });
      expect(action.label).toBe('Edit selected documents');
      expect(action.icon).toBe('pencil');
      expect(action['data-test-subj']).toBe('discoverEditSelectedDocumentsButton');
    });

    it('labels the action "Edit selected backing documents" in ES|QL mode', () => {
      const { action } = setup({ isEsqlMode: true });
      expect(action.label).toBe('Edit selected backing documents');
    });
  });

  describe('on click', () => {
    it('opens the index editor scoped to the selected documents when the user can write', async () => {
      const { action, notifications, uiActions } = setup({ canWrite: true });
      const executeTriggerActions = jest.mocked(uiActions.executeTriggerActions);

      action.onClick({ selectedDocIds: ['t1', 't2'] });

      await waitFor(() => expect(executeTriggerActions).toHaveBeenCalledTimes(1));
      expect(notifications.toasts.addDanger).not.toHaveBeenCalled();

      const [triggerId, rawContext] = executeTriggerActions.mock.calls[0];
      const { onClose, ...context } = rawContext as EditIndexContentContext;

      expect(triggerId).toBe(EDIT_INDEX_CONTENT_TRIGGER_ID);
      expect(context).toEqual({
        indexName: INDEX,
        doesIndexExist: true,
        canEditIndex: true,
        indexMode: 'standard',
        triggerSource: 'discover_bulk_action',
        initialFilter: { language: 'kuery', query: '_id: ("docA" or "docB")' },
      });
    });

    it('shows a danger toast and does not open the editor when documents span multiple indices', async () => {
      const otherIndexRecord = makeRecord('t5', { _id: 'docE', _index: 'orders' });
      const { action, notifications, uiActions } = setup({
        records: [recordA, otherIndexRecord],
      });
      const executeTriggerActions = jest.mocked(uiActions.executeTriggerActions);

      action.onClick({ selectedDocIds: ['t1', 't5'] });

      await waitFor(() => expect(notifications.toasts.addDanger).toHaveBeenCalledTimes(1));
      expect(notifications.toasts.addDanger).toHaveBeenCalledWith({
        title:
          'The selected documents belong to different indices. Select documents from a single index to edit them together.',
      });
      expect(executeTriggerActions).not.toHaveBeenCalled();
    });

    it(`shows a danger toast and does not open the editor beyond ${MAX_BULK_EDIT_DOCUMENTS} documents`, async () => {
      const manyRecords = Array.from({ length: MAX_BULK_EDIT_DOCUMENTS + 1 }, (_, i) =>
        makeRecord(`t${i}`, { _id: `doc${i}`, _index: INDEX })
      );
      const { action, notifications, uiActions } = setup({ records: manyRecords });
      const executeTriggerActions = jest.mocked(uiActions.executeTriggerActions);

      action.onClick({ selectedDocIds: manyRecords.map((record) => record.id) });

      await waitFor(() => expect(notifications.toasts.addDanger).toHaveBeenCalledTimes(1));
      expect(notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: `You can edit up to ${MAX_BULK_EDIT_DOCUMENTS} documents at once. Narrow your selection and try again.`,
      });
      expect(executeTriggerActions).not.toHaveBeenCalled();
    });

    it('shows a danger toast and does not open the editor when the user cannot write', async () => {
      const { action, notifications, uiActions } = setup({ canWrite: false });
      const executeTriggerActions = jest.mocked(uiActions.executeTriggerActions);

      action.onClick({ selectedDocIds: ['t1', 't2'] });

      await waitFor(() => expect(notifications.toasts.addDanger).toHaveBeenCalledTimes(1));
      expect(notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: `You don't have permission to edit documents in "${INDEX}".`,
      });
      expect(executeTriggerActions).not.toHaveBeenCalled();
    });

    it('escapes quotes in document ids when building the KQL filter', async () => {
      const quotedA = makeRecord('t1', { _id: 'a"b', _index: INDEX });
      const quotedB = makeRecord('t2', { _id: 'c"d', _index: INDEX });
      const { action, uiActions } = setup({ records: [quotedA, quotedB] });
      const executeTriggerActions = jest.mocked(uiActions.executeTriggerActions);

      action.onClick({ selectedDocIds: ['t1', 't2'] });

      await waitFor(() => expect(executeTriggerActions).toHaveBeenCalledTimes(1));
      const { initialFilter } = executeTriggerActions.mock.calls[0][1] as EditIndexContentContext;
      expect(initialFilter).toEqual({ language: 'kuery', query: '_id: ("a\\"b" or "c\\"d")' });
    });
  });
});
