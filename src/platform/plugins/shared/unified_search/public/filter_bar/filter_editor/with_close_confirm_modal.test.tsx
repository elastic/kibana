/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React, { useEffect } from 'react';
import { withCloseFilterEditorConfirmModal } from './with_close_confirm_modal';
import type { WithCloseFilterEditorConfirmModalProps } from './with_close_confirm_modal';

const phraseFilter = (value: string): Filter =>
  ({
    meta: {
      index: 'my-index',
      type: 'phrase',
      key: 'host',
      params: { query: value },
      negate: false,
      disabled: false,
      alias: null,
    },
    query: { match_phrase: { host: value } },
  } as Filter);

// Approximates a FilterItem / AddFilterPopover consumer:
//   - mounts the "editor" (renders `.filterEditor__hiddenItem`, the selector
//     `reArmFocusTrap` uses to locate the popover's focus trap)
//   - simulates an outside click via `pendingClickOutside`
//   - simulates an edit via `shouldEdit`
interface HarnessProps extends WithCloseFilterEditorConfirmModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  initialFilter: Filter;
  editedFilter: Filter;
  pendingClickOutside: boolean;
  onClickOutsideHandled: () => void;
  shouldEdit: boolean;
  onEditHandled: () => void;
}

const Harness: React.FC<HarnessProps> = ({
  isOpen,
  setIsOpen,
  initialFilter,
  editedFilter,
  onCloseFilterPopover,
  onLocalFilterCreate,
  onLocalFilterUpdate,
  pendingClickOutside,
  onClickOutsideHandled,
  shouldEdit,
  onEditHandled,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    onLocalFilterCreate({
      filter: initialFilter,
      queryDslFilter: { queryDsl: '{}', customLabel: null },
    });
    onLocalFilterUpdate(initialFilter);
  }, [isOpen, initialFilter, onLocalFilterCreate, onLocalFilterUpdate]);

  useEffect(() => {
    if (!shouldEdit) return;
    onLocalFilterUpdate(editedFilter);
    onEditHandled();
  }, [shouldEdit, editedFilter, onLocalFilterUpdate, onEditHandled]);

  useEffect(() => {
    if (!pendingClickOutside) return;
    onCloseFilterPopover([() => setIsOpen(false)]);
    onClickOutsideHandled();
  }, [pendingClickOutside, onCloseFilterPopover, setIsOpen, onClickOutsideHandled]);

  return isOpen ? <div className="filterEditor__hiddenItem" data-test-subj="editor-open" /> : null;
};

const WrappedHarness = withCloseFilterEditorConfirmModal(Harness);

interface DriverProps {
  filter: Filter;
  editedFilter: Filter;
}

const Driver: React.FC<DriverProps> = ({ filter, editedFilter }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [shouldEdit, setShouldEdit] = React.useState(false);
  const [pendingClickOutside, setPendingClickOutside] = React.useState(false);

  return (
    <div>
      <button data-test-subj="open" onClick={() => setIsOpen(true)} type="button">
        open
      </button>
      <button data-test-subj="edit" onClick={() => setShouldEdit(true)} type="button">
        edit
      </button>
      <button
        data-test-subj="click-outside"
        onClick={() => setPendingClickOutside(true)}
        type="button"
      >
        click outside
      </button>
      <WrappedHarness
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        initialFilter={filter}
        editedFilter={editedFilter}
        pendingClickOutside={pendingClickOutside}
        onClickOutsideHandled={() => setPendingClickOutside(false)}
        shouldEdit={shouldEdit}
        onEditHandled={() => setShouldEdit(false)}
      />
    </div>
  );
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('withCloseFilterEditorConfirmModal', () => {
  const original = phraseFilter('host-1');
  const edited = phraseFilter('host-2');
  const CONFIRM_MODAL = 'close-filter-editor-confirm-modal';

  it('closes the popover silently when the user clicks outside without editing', async () => {
    render(<Driver filter={original} editedFilter={edited} />);

    fireEvent.click(screen.getByTestId('open'));
    await flush();
    fireEvent.click(screen.getByTestId('click-outside'));
    await flush();

    expect(screen.queryByTestId('editor-open')).not.toBeInTheDocument();
    expect(screen.queryByTestId(CONFIRM_MODAL)).not.toBeInTheDocument();
  });

  it('keeps the popover open and shows the discard-changes modal when the user edits and clicks outside', async () => {
    render(<Driver filter={original} editedFilter={edited} />);

    fireEvent.click(screen.getByTestId('open'));
    await flush();
    fireEvent.click(screen.getByTestId('edit'));
    await flush();
    fireEvent.click(screen.getByTestId('click-outside'));
    await flush();

    expect(screen.getByTestId('editor-open')).toBeInTheDocument();
    expect(screen.getByTestId(CONFIRM_MODAL)).toBeInTheDocument();
  });

  it('dismisses the modal on "Keep editing" and leaves the popover open', async () => {
    render(<Driver filter={original} editedFilter={edited} />);

    fireEvent.click(screen.getByTestId('open'));
    await flush();
    fireEvent.click(screen.getByTestId('edit'));
    await flush();
    fireEvent.click(screen.getByTestId('click-outside'));
    await flush();
    fireEvent.click(screen.getByTestId('confirmModalCancelButton'));
    await flush();

    expect(screen.queryByTestId(CONFIRM_MODAL)).not.toBeInTheDocument();
    expect(screen.getByTestId('editor-open')).toBeInTheDocument();
  });

  it('closes the popover on "Discard"', async () => {
    render(<Driver filter={original} editedFilter={edited} />);

    fireEvent.click(screen.getByTestId('open'));
    await flush();
    fireEvent.click(screen.getByTestId('edit'));
    await flush();
    fireEvent.click(screen.getByTestId('click-outside'));
    await flush();
    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
    await flush();

    expect(screen.queryByTestId(CONFIRM_MODAL)).not.toBeInTheDocument();
    expect(screen.queryByTestId('editor-open')).not.toBeInTheDocument();
  });

  // Regression guard: only `meta.negate` changes between original and edited
  // filter (e.g. `exists` → `does not exist`, `is X` → `is not X`). The
  // comparator must include `negate: true` to detect this.
  it('shows the modal when only meta.negate is toggled', async () => {
    const negated: Filter = {
      ...original,
      meta: { ...original.meta, negate: true },
    };
    render(<Driver filter={original} editedFilter={negated} />);

    fireEvent.click(screen.getByTestId('open'));
    await flush();
    fireEvent.click(screen.getByTestId('edit'));
    await flush();
    fireEvent.click(screen.getByTestId('click-outside'));
    await flush();

    expect(screen.getByTestId(CONFIRM_MODAL)).toBeInTheDocument();
    expect(screen.getByTestId('editor-open')).toBeInTheDocument();
  });

  it('re-shows the modal on subsequent outside clicks after "Keep editing"', async () => {
    render(<Driver filter={original} editedFilter={edited} />);

    fireEvent.click(screen.getByTestId('open'));
    await flush();
    fireEvent.click(screen.getByTestId('edit'));
    await flush();
    fireEvent.click(screen.getByTestId('click-outside'));
    await flush();
    fireEvent.click(screen.getByTestId('confirmModalCancelButton'));
    await flush();

    fireEvent.click(screen.getByTestId('click-outside'));
    await flush();

    expect(screen.getByTestId(CONFIRM_MODAL)).toBeInTheDocument();
  });
});
