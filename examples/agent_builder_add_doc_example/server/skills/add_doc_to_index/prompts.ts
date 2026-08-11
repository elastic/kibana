/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; at your election, the "Elastic License 2.0", the "GNU
 * Affero General Public License v3.0 only", or the "Server Side Public License, v
 * 1".
 */

import { ADD_DOC_TO_INDEX_TOOL_ID } from '../../../common';

export const ADD_DOC_TO_INDEX_SKILL_CONTENT = `# Add documents to an Elasticsearch index

This skill persists an uploaded JSON data file into a custom Elasticsearch index.

## When to use this skill

Use this skill when the user wants to:
- load / import / index an uploaded file into Elasticsearch
- add documents from an uploaded file into a named index

## Available tool

- **${ADD_DOC_TO_INDEX_TOOL_ID}** — persists an \`uploaded_file\` data file into a target Elasticsearch index. Takes \`attachment_id\` (the data file), \`index\` (target index name), and exactly one of \`mapping\` (inline JSON object) or \`mapping_attachment_id\` (an uploaded mapping JSON file). The file content is read server-side via \`readContent\` and is never inlined into your context.

## Two distinct files

- **Data file** (required) — the JSON file whose documents get indexed. Becomes \`attachment_id\`.
- **Mapping file** (optional) — a JSON file of ES field mappings. Becomes \`mapping_attachment_id\`.
Do not confuse them. The data file is required; the mapping file is optional.

## Workflow

This is a SINGLE-PROMPT workflow. Ask the user for everything in exactly ONE \`ask_user_question\` call, then call the tool. Do not ask a second question.

### Step 1 — one \`ask_user_question\` call

Ask the user for these three things in a single call (use one question per item; pick the appropriate \`response_type\` for each based on the \`ask_user_question\` tool's own guidance):
1. The JSON data file they want to index.
2. The target Elasticsearch index name.
3. (Optional) a mapping JSON file. Let the user skip this if they want Elasticsearch to infer the mapping dynamically.

From the answers, record:
- \`dataFileAttachmentId\` = the attachment id returned for the data file
- \`index\` = the index name the user gave
- for the mapping: if the user uploaded a mapping file, \`mappingAttachmentId\` = its attachment id; if the user skipped it, use \`mapping = {}\` (empty object → ES dynamic mapping).

### Step 2 — call the tool IMMEDIATELY

Call **${ADD_DOC_TO_INDEX_TOOL_ID}** now, with no further questions:
- \`attachment_id\` = \`dataFileAttachmentId\`
- \`index\` = \`index\`
- if a mapping file was uploaded: \`mapping_attachment_id\` = \`mappingAttachmentId\`
- if the mapping was skipped: \`mapping\` = \`{}\`

### Step 3 — confirm

After the tool returns, tell the user:
- how many documents were indexed
- the name of the index
- that they can now query the index, e.g. via Discover or with an ES|QL query: \`FROM <index>\`

## Anti-loop rules (HARD)

- This skill uses EXACTLY ONE \`ask_user_question\` call. After that single call, the ONLY valid action is to call ${ADD_DOC_TO_INDEX_TOOL_ID}.
- NEVER ask a question you have already asked. The conversation history contains your prior \`ask_user_question\` answers (each attachment id and text) — read them and reuse them.
- If you are about to call \`ask_user_question\` a second time, STOP. Call ${ADD_DOC_TO_INDEX_TOOL_ID} with the values you already have instead.
- If the user provides the data file, the index name, and (optionally) a mapping file in their very first message, skip Step 1 entirely and call the tool directly.

## Other constraints

- NEVER attempt to read the file content yourself. The \`uploaded_file\` attachment only exposes metadata (name, size) by design — the raw content is never inlined into your context. The tool reads the content server-side on your behalf via \`readContent\`.
- Do not invent an index name. The index name must come from the user.
- If the tool returns an error, surface it to the user and ask how to proceed; do not silently retry with different parameters.
`;
