/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '@kbn/monaco';

interface RegisterCommandsParams {
  editor: monaco.editor.IStandaloneCodeEditor;
  getDocumentationLink: () => Promise<string | null>;
}

/**
 * Hook that sets up the autocomplete polling for Console editor.
 *
 * @param params The {@link RegisterCommandsParams} to use.
 */
export const useRegisterCommands = () => {
  return (params: RegisterCommandsParams) => {
    const { editor, getDocumentationLink } = params;

    const openDocs = async () => {
      const documentation = await getDocumentationLink();
      if (!documentation) {
        return;
      }
      window.open(documentation, '_blank');
    };

    editor.addCommand(monaco.KeyCode.Enter, openDocs);
  };
};
