/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { TextBasedLanguagesEditorProps } from './src/text_based_languages_editor';
export { fetchFieldsFromESQL } from './src/fetch_fields_from_esql';
import { TextBasedLanguagesEditor } from './src/text_based_languages_editor';

// React.lazy support
// eslint-disable-next-line import/no-default-export
export default TextBasedLanguagesEditor;
