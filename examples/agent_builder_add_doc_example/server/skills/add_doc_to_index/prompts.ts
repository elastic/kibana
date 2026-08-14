/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ADD_DOC_TO_INDEX_TOOL_ID } from '../../../common';

export const ADD_DOC_TO_INDEX_SKILL_CONTENT = `# Add documents to an Elasticsearch index

This skill adds documents from a JSON file to a custom Elasticsearch index.

## When to use this skill

Use this skill when the user wants to:
- load, import, or index a file into Elasticsearch
- add documents from a file into a named index

## Available tool

- **${ADD_DOC_TO_INDEX_TOOL_ID}** — adds the documents from a JSON file to a target Elasticsearch index. Provide the target index and either an inline mapping or a mapping file.

## Two distinct files

- **Data file** (required) — the JSON file whose documents should be indexed.
- **Mapping file** (optional) — a JSON file containing Elasticsearch field mappings.
Do not confuse them. The data file is required; the mapping file is optional.

## Workflow

Collect the required information in as few prompts as possible. Track each item independently and preserve every answer across prompts, regardless of the order in which the user provides it.

Before asking any question, check the conversation and all previous prompt answers for the information you need. Treat information already provided by the user as known, even when it was provided in a different prompt or order.

### Step 1 — ask for the missing information

When information is missing, ask the user for:
1. The JSON data file they want to index.
2. The target Elasticsearch index name.
3. An optional mapping JSON file. Allow the user to skip it so Elasticsearch can infer the mapping dynamically.

Request files through the question prompt. If the user asks how to upload the file, do not explain chat controls, paperclip buttons, or manual upload steps; start the question prompt so the user can provide the file there.

If any item is still missing after a prompt, ask only for the missing item or items. Questions may be answered in any order.

### Step 2 — confirm before proceeding

After the data file, index name, and mapping choice are known, summarize what the user provided:
- the data file name
- the target index name
- the mapping file name, or that Elasticsearch will infer the mapping

Ask the user to confirm that these details are correct. Do not proceed until the user confirms.

If the user requests a change, ask only for the changed information and summarize the complete updated details again before proceeding.

### Step 3 — call the tool

After confirmation, call **${ADD_DOC_TO_INDEX_TOOL_ID}** immediately:
- use the data file supplied by the user
- use the index name supplied by the user
- if a mapping file was supplied, use it as the mapping
- if the mapping was skipped, pass \`mapping = {}\`

### Step 4 — report the result

After the tool returns, tell the user:
- how many documents were indexed
- the name of the index
- that they can now query the index, e.g. via Discover or with an ES|QL query: \`FROM <index>\`

## Anti-loop rules (HARD)

- Never ask for any information that you already have.
- Before every question prompt, check the conversation and previous answers again.
- After every answer, recompute which items are still missing. Do not restart the initial collection prompt or discard answers from earlier prompts.
- A follow-up prompt is allowed only for information that is still missing, for a user-requested change, or when confirmation has not yet been given.
- After confirmation, the only valid action is to call ${ADD_DOC_TO_INDEX_TOOL_ID}.
- If the user provides the data file, the index name, and (optionally) a mapping file in their very first message, skip Step 1 entirely and summarize the details for confirmation.

## Other constraints

- Do not attempt to inspect or reproduce the file contents in the conversation. Let the tool process the supplied files.
- Do not invent an index name. The index name must come from the user.
- If the tool returns an error, surface it to the user and ask how to proceed; do not silently retry with different parameters.
`;
