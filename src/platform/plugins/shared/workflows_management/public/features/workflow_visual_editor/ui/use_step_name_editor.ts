/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';

/**
 * Editing a step's name in place in the panel header: the draft, the error, and what ends the
 * edit. A name must not be empty and must not be another step's.
 */
export const useStepNameEditor = ({
  committedName,
  siblingStepNames,
  onCommit,
}: {
  /** The name the step has now. */
  readonly committedName: string;
  /** The names of every step in the workflow, trimmed. */
  readonly siblingStepNames: ReadonlySet<string>;
  /** Called with the new, trimmed name when an edit is accepted. */
  readonly onCommit: (name: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | undefined>();
  const baselineRef = useRef('');
  /** Mirrors `isEditing` for handlers that must not wait for a render (blur after Escape). */
  const isEditingRef = useRef(false);

  const begin = useCallback(() => {
    baselineRef.current = committedName;
    setDraft(committedName);
    setError(undefined);
    isEditingRef.current = true;
    setIsEditing(true);
    window.requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.select();
    });
  }, [committedName]);

  const revert = useCallback(() => {
    isEditingRef.current = false;
    setIsEditing(false);
    setDraft(baselineRef.current);
    setError(undefined);
  }, []);

  const commit = useCallback(() => {
    if (!isEditingRef.current) return;
    const next = draft.trim();
    if (!next) {
      setError(
        i18n.translate('workflows.stepConfigPanel.stepNameRequired', {
          defaultMessage: 'Step name is required',
        })
      );
      return;
    }
    if (next !== baselineRef.current.trim() && siblingStepNames.has(next)) {
      setError(
        i18n.translate('workflows.stepConfigPanel.stepNameDuplicate', {
          defaultMessage: 'A step named "{name}" already exists',
          values: { name: next },
        })
      );
      return;
    }
    // TODO(slice4): renaming does not rewrite steps.<old-name> references elsewhere.
    onCommit(next);
    isEditingRef.current = false;
    setIsEditing(false);
    setError(undefined);
  }, [draft, siblingStepNames, onCommit]);

  const changeDraft = useCallback(
    (text: string) => {
      setDraft(text);
      if (error) setError(undefined);
    },
    [error]
  );

  /** For a panel handed a new step: leave editing and drop the error. */
  const reset = useCallback(() => {
    setIsEditing(false);
    setError(undefined);
  }, []);

  return {
    inputRef,
    isEditing,
    isEditingRef,
    draft,
    error,
    /** The name to show: what is being typed while editing, else the step's own. */
    displayName: isEditing ? draft.trim() : committedName,
    begin,
    revert,
    commit,
    changeDraft,
    reset,
  };
};

export type StepNameEditor = ReturnType<typeof useStepNameEditor>;
