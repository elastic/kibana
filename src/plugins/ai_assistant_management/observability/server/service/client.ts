/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KnowledgeBaseService } from './kb_service';

export class AIAssistantManagementObservabilityClient {
  constructor(
    private readonly dependencies: {
      knowledgeBaseService: KnowledgeBaseService;
    }
  ) {}

  getKnowledgeBaseStatus = () => {
    return this.dependencies.knowledgeBaseService.status();
  };

  setupKnowledgeBase = () => {
    return this.dependencies.knowledgeBaseService.setup();
  };
}
