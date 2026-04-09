/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// @generated — DO NOT EDIT DIRECTLY. Edit .elasticsearch-agent/skills and run ./build

import { catalogEcommerceSkill } from './catalog_ecommerce';
import { keywordSearchSkill } from './keyword_search';
import { ragChatbotSkill } from './rag_chatbot';
import { useCaseLibrarySkill } from './use_case_library';
import { vectorHybridSearchSkill } from './vector_hybrid_search';
export {
  catalogEcommerceSkill,
  keywordSearchSkill,
  ragChatbotSkill,
  useCaseLibrarySkill,
  vectorHybridSearchSkill,
};

export const skills = [
  catalogEcommerceSkill,
  keywordSearchSkill,
  ragChatbotSkill,
  useCaseLibrarySkill,
  vectorHybridSearchSkill,
];
