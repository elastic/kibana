/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import type { CSSObject } from '@emotion/react';
import { useCallback, useMemo, useState } from 'react';
import type { monaco } from '@kbn/code-editor';
import {
  getReferenceChipEditorCss,
  useReferenceDecorations,
  useReferenceIconMasks,
} from './use_reference_decorations';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';
import type { ReferenceToken } from '../lib/reference_tokens';
import { findReferenceTokens } from '../lib/reference_tokens';

type Editor = monaco.editor.IStandaloneCodeEditor;

interface TextChange {
  readonly changes: ReadonlyArray<{ readonly rangeOffset: number; readonly text: string }>;
}

/** Where the caret is after an edit: the end of the last change, or the end of the text. */
export const caretAfterChange = (text: string, event: TextChange | undefined): number => {
  const last = event?.changes?.[event.changes.length - 1];
  return Math.min(last ? last.rangeOffset + last.text.length : text.length, text.length);
};

/**
 * What an editor that shows `{{ }}` references as chips needs, whichever field hosts it: the
 * references in the text, the chips drawn on the editor that mounted, and the "list inside a
 * sentence" warning with its dismissal.
 */
export const useReferenceEditor = ({
  text,
  catalog,
  warnContainersInSentence,
  quotedStringsAreValues = false,
}: {
  readonly text: string;
  readonly catalog: DataReferenceCatalog;
  /** Flag a known list or record in a sentence. Only meaningful for free text. */
  readonly warnContainersInSentence: boolean;
  /** The text is JSON, where a reference filling a quoted string is the whole value. */
  readonly quotedStringsAreValues?: boolean;
}): {
  readonly tokens: readonly ReferenceToken[];
  /** Styles for the chips; apply them to an ancestor of the editor. */
  readonly chipCss: CSSObject;
  readonly editor: Editor | null;
  /** Call from the editor's mount hook. Keeps the first editor until `releaseEditor`. */
  readonly captureEditor: (mounted: Editor) => void;
  readonly releaseEditor: () => void;
  /** The first list or record in a sentence that was not dismissed. */
  readonly warning: ReferenceToken | undefined;
  /** Hides the warning for the reference it points at. */
  readonly dismissWarning: () => void;
} => {
  const { euiTheme, colorMode } = useEuiTheme();
  const masks = useReferenceIconMasks();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());

  const tokens = useMemo(
    () => findReferenceTokens(text, { catalog, warnContainersInSentence, quotedStringsAreValues }),
    [catalog, text, warnContainersInSentence, quotedStringsAreValues]
  );
  useReferenceDecorations(editor, text, tokens);
  const chipCss = useMemo(
    () => getReferenceChipEditorCss(euiTheme, masks, colorMode),
    [euiTheme, masks, colorMode]
  );

  const warning = tokens.find(
    (token) => token.isContainerInSentence && !dismissed.has(token.expression)
  );
  const dismissWarning = useCallback(() => {
    if (warning) setDismissed((current) => new Set(current).add(warning.expression));
  }, [warning]);

  const captureEditor = useCallback((mounted: Editor) => {
    setEditor((current) => current ?? mounted);
  }, []);
  const releaseEditor = useCallback(() => setEditor(null), []);

  return { tokens, chipCss, editor, captureEditor, releaseEditor, warning, dismissWarning };
};
