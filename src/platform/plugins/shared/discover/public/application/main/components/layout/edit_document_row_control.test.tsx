/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { httpServiceMock, notificationServiceMock } from '@kbn/core/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { EDIT_INDEX_CONTENT_TRIGGER_ID } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { EditIndexContentContext } from '@kbn/index-editor';
import type { DataTableRecord, RowControlComponent, RowControlRowProps } from '@kbn/discover-utils';
import { createEditDocumentRowControl } from './edit_document_row_control';

const INDEX = 'my-index';

const makeRecord = (raw: Record<string, unknown>): DataTableRecord => ({
  id: 'synthetic-id',
  raw,
  flattened: raw,
});

const editableRecord = makeRecord({ _id: 'doc1', _index: INDEX });

// Minimal stand-in for the control component UnifiedDataTable injects at runtime. It surfaces the
// props under test and forwards clicks, like the real EuiButtonIcon-based control.
const Control: RowControlComponent = (props) => (
  <button
    type="button"
    aria-label={props.label}
    title={typeof props.tooltipContent === 'string' ? props.tooltipContent : undefined}
    data-test-subj={props['data-test-subj']}
    data-icon-type={props.iconType}
    onClick={() => props.onClick?.({ rowIndex: 0, record: editableRecord })}
  >
    {props.label}
  </button>
);

const rowProps = (record: DataTableRecord): RowControlRowProps => ({ rowIndex: 0, record });

const setup = ({
  isEsqlMode = false,
  canWrite = true,
}: { isEsqlMode?: boolean; canWrite?: boolean } = {}) => {
  const http = httpServiceMock.createStartContract();
  http.get.mockResolvedValue({ [INDEX]: { write: canWrite } });
  const notifications = notificationServiceMock.createStartContract();
  const uiActions = uiActionsPluginMock.createStartContract();
  const onEdited = jest.fn();

  const control = createEditDocumentRowControl({
    isEsqlMode,
    http,
    notifications,
    uiActions,
    onEdited,
  });

  return { control, http, notifications, uiActions, onEdited };
};

describe('createEditDocumentRowControl', () => {
  describe('isAvailable', () => {
    it('is available for a record with a concrete _id and _index', () => {
      const { control } = setup();
      expect(control.isAvailable?.(rowProps(editableRecord))).toBe(true);
    });

    it('is hidden when the record lacks _id or _index (e.g. ES|QL without METADATA)', () => {
      const { control } = setup();
      expect(control.isAvailable?.(rowProps(makeRecord({ _index: INDEX })))).toBe(false);
      expect(control.isAvailable?.(rowProps(makeRecord({ _id: 'doc1' })))).toBe(false);
    });

    it('is hidden for reserved dot-prefixed indices (system/internal/data-stream backing)', () => {
      const { control } = setup();
      const backingDoc = makeRecord({ _id: 'doc1', _index: '.ds-logs-prod-2024.01.01-000003' });
      expect(control.isAvailable?.(rowProps(backingDoc))).toBe(false);
    });

    it('is hidden for remote cross-cluster indices, which cannot be written to locally', () => {
      const { control } = setup();
      const remoteDoc = makeRecord({ _id: 'doc1', _index: 'my_remote:customers-2' });
      expect(control.isAvailable?.(rowProps(remoteDoc))).toBe(false);
    });
  });

  describe('rendering', () => {
    it('renders a pencil control labelled "Edit document" in data view mode', () => {
      const { control } = setup({ isEsqlMode: false });
      render(<>{control.render(Control, rowProps(editableRecord))}</>);

      const button = screen.getByRole('button', { name: 'Edit document' });
      expect(button).toBeVisible();
      expect(button).toHaveAttribute('data-icon-type', 'pencil');
      expect(button).toHaveAttribute('data-test-subj', 'discoverEditDocumentButton');
      // The hover tooltip comes from tooltipContent, not the aria-label.
      expect(button).toHaveAttribute('title', 'Edit document');
    });

    it('labels the control "Edit backing document" in ES|QL mode', () => {
      const { control } = setup({ isEsqlMode: true });
      render(<>{control.render(Control, rowProps(editableRecord))}</>);

      const button = screen.getByRole('button', { name: 'Edit backing document' });
      expect(button).toBeVisible();
      expect(button).toHaveAttribute('title', 'Edit backing document');
    });
  });

  describe('on click', () => {
    it('opens the index editor scoped to the clicked document when the user can write', async () => {
      const { control, http, uiActions, notifications, onEdited } = setup({ canWrite: true });
      const executeTriggerActions = jest.mocked(uiActions.executeTriggerActions);
      render(<>{control.render(Control, rowProps(editableRecord))}</>);

      await userEvent.click(screen.getByTestId('discoverEditDocumentButton'));

      await waitFor(() => expect(executeTriggerActions).toHaveBeenCalledTimes(1));
      expect(http.get).toHaveBeenCalledWith(expect.stringContaining('/privileges'), {
        query: { indexName: INDEX },
      });
      expect(notifications.toasts.addDanger).not.toHaveBeenCalled();

      const [triggerId, rawContext] = executeTriggerActions.mock.calls[0];
      // The recorded context is typed `object`; we control its runtime shape here.
      const { onClose, ...context } = rawContext as EditIndexContentContext;

      expect(triggerId).toBe(EDIT_INDEX_CONTENT_TRIGGER_ID);
      expect(context).toEqual({
        indexName: INDEX,
        doesIndexExist: true,
        canEditIndex: true,
        indexMode: 'standard',
        triggerSource: 'discover_row_action',
        initialFilter: { language: 'kuery', query: '_id: "doc1"' },
      });

      expect(onEdited).not.toHaveBeenCalled();
      onClose?.({ indexName: INDEX, indexCreatedDuringFlyout: false, indexHasNewFields: false });
      expect(onEdited).toHaveBeenCalledTimes(1);
    });

    it('shows a danger toast and does not open the editor when the user cannot write', async () => {
      const { control, uiActions, notifications } = setup({ canWrite: false });
      const executeTriggerActions = jest.mocked(uiActions.executeTriggerActions);
      render(<>{control.render(Control, rowProps(editableRecord))}</>);

      await userEvent.click(screen.getByTestId('discoverEditDocumentButton'));

      await waitFor(() => expect(notifications.toasts.addDanger).toHaveBeenCalledTimes(1));
      expect(notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: `You don't have permission to edit documents in "${INDEX}".`,
      });
      expect(executeTriggerActions).not.toHaveBeenCalled();
    });

    it('escapes quotes in the document id when building the KQL filter', async () => {
      const { control, uiActions } = setup({ canWrite: true });
      const executeTriggerActions = jest.mocked(uiActions.executeTriggerActions);
      const quotedIdRecord = makeRecord({ _id: 'a"b', _index: INDEX });
      render(<>{control.render(Control, rowProps(quotedIdRecord))}</>);

      await userEvent.click(screen.getByTestId('discoverEditDocumentButton'));

      await waitFor(() => expect(executeTriggerActions).toHaveBeenCalledTimes(1));
      // The recorded context is typed `object`; we control its runtime shape here.
      const { initialFilter } = executeTriggerActions.mock.calls[0][1] as EditIndexContentContext;
      expect(initialFilter).toEqual({ language: 'kuery', query: '_id: "a\\"b"' });
    });
  });
});
