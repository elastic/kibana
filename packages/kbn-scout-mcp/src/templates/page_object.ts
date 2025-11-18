/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface PageObjectOptions {
  pageName: string;
  description: string;
  locators: Array<{ name: string; testSubj: string; description?: string }>;
  actions: Array<{ name: string; code: string; description?: string }>;
  hasAssertions: boolean;
}

export function generateSimplePageObject(options: PageObjectOptions): string {
  const { pageName, description, locators, actions } = options;

  const locatorDeclarations = locators.map((loc) => `  public ${loc.name}: Locator;`).join('\n');

  const locatorInitializations = locators
    .map((loc) => {
      const comment = loc.description ? `    // ${loc.description}\n` : '';
      return `${comment}    this.${loc.name} = this.page.testSubj.locator('${loc.testSubj}');`;
    })
    .join('\n');

  const actionMethods = actions
    .map((action) => {
      const comment = action.description ? `  /**\n   * ${action.description}\n   */\n` : '';
      return `${comment}  async ${action.name}() {\n    ${action.code}\n  }`;
    })
    .join('\n\n');

  return `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage, Locator } from '@kbn/scout';

/**
 * Page Object for ${pageName}
 *
 * ${description}
 */
export class ${pageName}Page {
${locatorDeclarations}

  constructor(private readonly page: ScoutPage) {
${locatorInitializations}
  }

  // ========================================
  // Actions
  // ========================================

${actionMethods}
}
`;
}

export interface OrchestratorPageObjectOptions {
  pageName: string;
  description: string;
  actionClasses: Array<{ name: string; propertyName: string }>;
  hasLocators: boolean;
  hasAssertions: boolean;
  highLevelMethods: Array<{ name: string; code: string; description?: string }>;
}

export function generateOrchestratorPageObject(options: OrchestratorPageObjectOptions): string {
  const { pageName, description, actionClasses, hasLocators, hasAssertions, highLevelMethods } =
    options;

  const imports = [`import type { ScoutPage } from '@kbn/scout';`];
  if (hasLocators) {
    imports.push(`import { ${pageName}Locators } from './${pageName.toLowerCase()}_locators';`);
  }
  actionClasses.forEach((ac) => {
    imports.push(
      `import { ${ac.name} } from './${ac.name
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .slice(1)}';`
    );
  });
  if (hasAssertions) {
    imports.push(`import { ${pageName}Assertions } from './${pageName.toLowerCase()}_assertions';`);
  }

  const propertyDeclarations = [];
  if (hasLocators) {
    propertyDeclarations.push(`  public readonly locators: ${pageName}Locators;`);
  }
  actionClasses.forEach((ac) => {
    propertyDeclarations.push(`  public readonly ${ac.propertyName}: ${ac.name};`);
  });
  if (hasAssertions) {
    propertyDeclarations.push(`  public readonly assertions: ${pageName}Assertions;`);
  }

  const initialization = [];
  if (hasLocators) {
    initialization.push(`    this.locators = new ${pageName}Locators(page);`);
  }
  actionClasses.forEach((ac) => {
    initialization.push(
      `    this.${ac.propertyName} = new ${ac.name}(page${hasLocators ? ', this.locators' : ''});`
    );
  });
  if (hasAssertions) {
    initialization.push(
      `    this.assertions = new ${pageName}Assertions(page${
        hasLocators ? ', this.locators' : ''
      });`
    );
  }

  const methodsSection =
    highLevelMethods.length > 0
      ? `\n  // ========================================
  // High-Level Methods
  // ========================================

${highLevelMethods
  .map((method) => {
    const comment = method.description ? `  /**\n   * ${method.description}\n   */\n` : '';
    return `${comment}  async ${method.name}() {\n    ${method.code}\n  }`;
  })
  .join('\n\n')}`
      : '';

  return `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

${imports.join('\n')}

/**
 * Page Object for ${pageName}
 *
 * ${description}
 *
 * This class acts as an orchestrator, delegating to specialized action classes.
 */
export class ${pageName}Page {
${propertyDeclarations.join('\n')}

  constructor(private readonly page: ScoutPage) {
${initialization.join('\n')}
  }${methodsSection}
}
`;
}
