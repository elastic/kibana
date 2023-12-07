/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { CodeEditorProps as Props } from '@kbn/code-editor';

import { CodeEditor } from '@kbn/code-editor';
export { CodeEditor };

// React.lazy requires default export
// eslint-disable-next-line import/no-default-export
export default CodeEditor;
