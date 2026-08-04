/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';
import type { MessageField } from '../types/action_types';

export interface UseGeneratedActionMessageProps<ActionParams> {
  template?: string;
  groupKey: string;
  messageField?: MessageField<ActionParams>;
  params: Partial<ActionParams>;
  onChange(partial: Partial<ActionParams>): void;
}

/**
 * Owns generated/customized/blank message state for one action item.
 *
 * On mount, seeds internal state from existing params:
 * - exact template match → generated
 * - blank (trimmed) → initialized/blank
 * - other non-blank → customized (stored by groupKey)
 *
 * On groupKey change, saves the outgoing message (if customized) and
 * restores a previously saved edit for the incoming key, or writes the
 * template if no edit exists.
 *
 * When messageField is absent, the hook is a no-op.
 */
export const useGeneratedActionMessage = <ActionParams>({
  template,
  groupKey,
  messageField,
  params,
  onChange,
}: UseGeneratedActionMessageProps<ActionParams>): void => {
  // Keep latest values accessible from effects without adding to dep arrays
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const templateRef = useRef(template);
  templateRef.current = template;

  // Per-group user edits and owner-written values
  const editsRef = useRef<Map<string, string>>(new Map());
  const lastWrittenRef = useRef<Map<string, string>>(new Map());
  const prevGroupKeyRef = useRef(groupKey);
  const mountedRef = useRef(false);

  // Mount seeding: classify the value already in params for the initial group key
  useEffect(() => {
    if (!messageField) return;

    const currentMessage = messageField.get(paramsRef.current) ?? '';
    const normalizedTemplate = templateRef.current ?? '';

    if (currentMessage === normalizedTemplate) {
      lastWrittenRef.current.set(groupKey, normalizedTemplate);
    } else if (currentMessage.trim() !== '') {
      editsRef.current.set(groupKey, currentMessage);
    }

    mountedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Group key transition: save outgoing state and restore or write for incoming key
  useEffect(() => {
    if (!messageField) return;
    if (!mountedRef.current) return;

    const prevKey = prevGroupKeyRef.current;
    if (prevKey === groupKey) return;

    const currentMessage = messageField.get(paramsRef.current) ?? '';
    const prevLastWritten = lastWrittenRef.current.get(prevKey);

    // Save outgoing message if customized (non-blank, not what the owner last wrote).
    // Otherwise delete any stale edit so the next visit gets the template.
    if (currentMessage.trim() !== '' && currentMessage !== prevLastWritten) {
      editsRef.current.set(prevKey, currentMessage);
    } else {
      editsRef.current.delete(prevKey);
    }

    prevGroupKeyRef.current = groupKey;

    const savedEdit = editsRef.current.get(groupKey);
    if (savedEdit !== undefined) {
      onChangeRef.current(messageField.set(paramsRef.current, savedEdit));
    } else {
      const newMessage = templateRef.current ?? '';
      onChangeRef.current(messageField.set(paramsRef.current, newMessage));
      lastWrittenRef.current.set(groupKey, newMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupKey]);
};
