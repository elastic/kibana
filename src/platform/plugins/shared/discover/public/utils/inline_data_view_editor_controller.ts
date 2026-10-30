/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type {
  InlineDataViewEditOptions,
  InlineDataViewEditSession,
} from '../services/inline_data_view_edit_session';

/** The step of an inline edit that failed: opening the editor or applying its result. */
export type InlineDataViewEditPhase = 'open' | 'commit';

type CloseEditor = () => void;

interface EditActions {
  cancel: CloseEditor;
  commit: (
    onSave: (dataView: DataView) => void | Promise<void>,
    options?: InlineDataViewEditOptions
  ) => Promise<void>;
}

interface OpenEditorOptions {
  session: InlineDataViewEditSession;
  openEditor: (draft: DataView, actions: EditActions) => CloseEditor | Promise<CloseEditor>;
  onError: (error: Error, phase: InlineDataViewEditPhase) => void;
}

interface InlineDataViewEditorController {
  open: (options: OpenEditorOptions) => CloseEditor;
  dispose: CloseEditor;
}

const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
};

/** Owns a UI's active editor, cancelling its session on replacement or disposal. */
export const createInlineDataViewEditorController = (): InlineDataViewEditorController => {
  let activeEditor: CloseEditor | undefined;

  const dispose = () => {
    const close = activeEditor;
    activeEditor = undefined;
    close?.();
  };

  return {
    dispose,
    open: (options) => {
      dispose();
      const close = openInlineDataViewEditor(options);
      activeEditor = close;

      return () => {
        if (activeEditor === close) {
          activeEditor = undefined;
        }

        close();
      };
    },
  };
};

const openInlineDataViewEditor = ({
  session,
  openEditor,
  onError,
}: OpenEditorOptions): CloseEditor => {
  let closed = false;
  let saving = false;
  let closeEditor: CloseEditor | undefined;

  const close = () => {
    if (closed) {
      return;
    }

    closed = true;

    try {
      closeEditor?.();
    } finally {
      session.dispose();
    }
  };

  const commit: EditActions['commit'] = async (onSave, options) => {
    if (closed || saving) {
      return;
    }

    saving = true;
    let dataView: DataView;

    try {
      dataView = await session.commit(options);
    } catch (error) {
      if (!closed) {
        onError(toError(error), 'commit');
      }

      return;
    }

    // Callback failures belong to the consumer, not to identity finalization.
    if (!closed) {
      await onSave(dataView);
    }
  };

  const open = async () => {
    const draft = await session.draft;

    if (closed) {
      return;
    }

    closeEditor = await openEditor(draft, { cancel: close, commit });

    if (closed) {
      closeEditor();
    }
  };

  void open().catch((error) => {
    if (!closed) {
      close();
      onError(toError(error), 'open');
    }
  });

  return close;
};
