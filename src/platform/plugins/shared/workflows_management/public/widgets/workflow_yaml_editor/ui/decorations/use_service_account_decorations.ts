/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { isScalar, parseDocument } from 'yaml';
import { monaco } from '@kbn/code-editor';
import type {
  ServiceAccountDirectory,
  WorkflowServiceAccount,
} from '../../../../entities/service_accounts';
import { useServiceAccountDirectory } from '../../../../entities/service_accounts';

interface ServiceAccountReference {
  id: string;
  range: monaco.IRange;
}

const getReference = (model: monaco.editor.ITextModel): ServiceAccountReference | null => {
  const document = parseDocument(model.getValue());
  const value = document.getIn(['settings', 'run_as'], true);
  if (!isScalar(value) || typeof value.value !== 'string' || !value.value || !value.range)
    return null;
  const start = model.getPositionAt(value.range[0]);
  const end = model.getPositionAt(value.range[1]);
  if (start.lineNumber !== end.lineNumber) return null;
  return {
    id: value.value,
    range: {
      startLineNumber: start.lineNumber,
      startColumn: start.column,
      endLineNumber: end.lineNumber,
      endColumn: end.column,
    },
  };
};

const createDecoration = (
  reference: ServiceAccountReference,
  account: WorkflowServiceAccount
): monaco.editor.IModelDeltaDecoration => {
  const available = account.enabled && account.assumable;
  return {
    range: reference.range,
    options: {
      stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
      before: {
        content: `${available ? '✓' : '○'} ${account.name.replace(/[\r\n\t]/g, ' ')}`,
        cursorStops: monaco.editor.InjectedTextCursorStops.None,
        inlineClassName: available
          ? 'service-account-name-badge'
          : 'service-account-name-badge-unavailable',
      },
    },
  };
};

/** Keeps the resolved-account badge separate from the YAML and ignores stale lookups. */
export const registerServiceAccountDecorations = (
  editor: monaco.editor.IStandaloneCodeEditor,
  directory: ServiceAccountDirectory
): monaco.IDisposable => {
  const decorations = editor.createDecorationsCollection();
  let revision = 0;
  let requestedId: string | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const update = async (): Promise<void> => {
    const currentRevision = ++revision;
    const model = editor.getModel();
    const reference = model && directory.isEnabled() ? getReference(model) : null;
    if (reference?.id !== requestedId || !reference) decorations.clear();
    requestedId = reference?.id;
    if (!model || !reference) return;
    const version = model.getVersionId();
    const account = await directory.get(reference.id);
    if (
      currentRevision !== revision ||
      editor.getModel() !== model ||
      model.getVersionId() !== version
    )
      return;
    decorations.set(account ? [createDecoration(reference, account)] : []);
  };

  const scheduleUpdate = (): void => {
    revision++;
    clearTimeout(timeout);
    timeout = setTimeout(() => void update(), 150);
  };
  const contentSubscription = editor.onDidChangeModelContent(scheduleUpdate);
  const modelSubscription = editor.onDidChangeModel(() => {
    decorations.clear();
    requestedId = undefined;
    scheduleUpdate();
  });
  void update();

  return {
    dispose: () => {
      revision++;
      clearTimeout(timeout);
      contentSubscription.dispose();
      modelSubscription.dispose();
      decorations.clear();
    },
  };
};

export const useServiceAccountDecorations = ({
  editor,
  isEditorMounted,
}: {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  isEditorMounted: boolean;
}): void => {
  const directory = useServiceAccountDirectory();
  useEffect(() => {
    if (!editor || !isEditorMounted) return;
    const registration = registerServiceAccountDecorations(editor, directory);
    return () => registration.dispose();
  }, [editor, isEditorMounted, directory]);
};
