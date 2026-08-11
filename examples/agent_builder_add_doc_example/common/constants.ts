/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const PLUGIN_ID = 'agentBuilderAddDocExample';
export const PLUGIN_NAME = 'Agent Builder add-doc-to-index example';

/** Attachment type id for uploaded files (platform-owned built-in `uploaded_file` type). */
export const UPLOADED_FILE_ATTACHMENT_TYPE = 'uploaded_file';

/** Skill id. */
export const ADD_DOC_TO_INDEX_SKILL_ID = 'add-doc-to-index';

/** Inline tool id exposed by the skill. */
export const ADD_DOC_TO_INDEX_TOOL_ID = 'add-doc-to-index.add_doc_to_index';

/** Max bytes the tool will read from an uploaded_file attachment via readContent. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
