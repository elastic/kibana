/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { ADD_DOC_TO_INDEX_SKILL_ID, ADD_DOC_TO_INDEX_TOOL_ID } from '../../../common';
import { addDocToIndexTool } from './tool';
import { ADD_DOC_TO_INDEX_SKILL_CONTENT } from './prompts';

export { ADD_DOC_TO_INDEX_TOOL_ID };

const NAME = 'add-doc-to-index';
const BASE_PATH = 'skills/platform';

export const createAddDocToIndexSkill = (): SkillDefinition<typeof NAME, typeof BASE_PATH> => {
  return defineSkillType({
    id: ADD_DOC_TO_INDEX_SKILL_ID,
    name: NAME,
    basePath: BASE_PATH,
    description:
      'Persist an uploaded file into a custom Elasticsearch index with a user-supplied mapping. Use when the user wants to load, import, or index an uploaded JSON file into Elasticsearch.',
    content: ADD_DOC_TO_INDEX_SKILL_CONTENT,
    getInlineTools: () => [addDocToIndexTool()],
  });
};
