/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Logical AI index the AlertZero workers share.
 *
 * Coverage and forensics workflows pass this id to `context-engine.createKi` /
 * `updateKi`, and their searches read `ai-index-idx-<id>`. One index holds every
 * space; documents carry `attributes.space_id`.
 *
 * Workflow YAML cannot import this module. Definitions that own the default
 * write `__SECURITY_INVESTIGATIONS_AI_INDEX_ID__`; `renderCommonWorkerYaml`
 * substitutes this id when the YAML is rendered.
 */
export const SECURITY_INVESTIGATIONS_AI_INDEX_ID = 'security-investigations';

/** Placeholder substituted into workflow YAML that defaults to this index. */
export const SECURITY_INVESTIGATIONS_AI_INDEX_ID_TOKEN = '__SECURITY_INVESTIGATIONS_AI_INDEX_ID__';

/**
 * Backing index for {@link SECURITY_INVESTIGATIONS_AI_INDEX_ID}.
 *
 * The `ai-index-idx` Elasticsearch template owns the mappings and creates the
 * index on the first write. This is an index, not an `ai-index-ds-` data stream:
 * workers update an indicator in place (`attributes.status`) and then search for
 * `pending`. A data stream would keep the earlier revision, so that search would
 * match indicators already processed.
 */
export const SECURITY_INVESTIGATIONS_AI_INDEX_NAME = `ai-index-idx-${SECURITY_INVESTIGATIONS_AI_INDEX_ID}`;
