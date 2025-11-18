/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  generateSimplePageObject,
  generateOrchestratorPageObject,
  generateApiService,
  type PageObjectOptions,
  type OrchestratorPageObjectOptions,
  type ApiServiceOptions,
} from '../templates';

/**
 * Generate page object code
 */
export async function scoutGeneratePageObjectCode(params: {
  pageName: string;
  description: string;
  architecture?: 'simple' | 'orchestrator';
  locators?: Array<{ name: string; testSubj: string; description?: string }>;
  actions?: Array<{ name: string; code: string; description?: string }>;
  actionClasses?: Array<{ name: string; propertyName: string }>;
  hasAssertions?: boolean;
}) {
  try {
    const {
      pageName,
      description,
      architecture = 'simple',
      locators = [],
      actions = [],
      actionClasses = [],
      hasAssertions = false,
    } = params;

    let code: string;

    if (architecture === 'orchestrator') {
      const options: OrchestratorPageObjectOptions = {
        pageName,
        description,
        actionClasses,
        hasLocators: true,
        hasAssertions,
        highLevelMethods: [],
      };
      code = generateOrchestratorPageObject(options);
    } else {
      const options: PageObjectOptions = {
        pageName,
        description,
        locators,
        actions,
        hasAssertions,
      };
      code = generateSimplePageObject(options);
    }

    return {
      success: true,
      data: code,
      message: `Generated ${architecture} page object for ${pageName}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Generate API service code
 */
export async function scoutGenerateApiServiceCode(params: {
  serviceName: string;
  description: string;
  basePath: string;
  methods: Array<{
    name: string;
    description?: string;
    httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    hasBody?: boolean;
    returns?: string;
  }>;
}) {
  try {
    const options: ApiServiceOptions = params;
    const code = generateApiService(options);

    return {
      success: true,
      data: code,
      message: `Generated API service for ${params.serviceName}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
