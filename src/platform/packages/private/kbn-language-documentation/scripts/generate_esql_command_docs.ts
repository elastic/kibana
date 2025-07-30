/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

import * as recast from 'recast';
const n = recast.types.namedTypes;
import * as fs from 'fs';
import * as path from 'path';
import { ElasticsearchCommandDefinition } from '@kbn/esql-ast';

// Constants for paths
const COMMANDS_DEFINITION_PATH = '/docs/reference/query-languages/esql/kibana/definition/commands';
const SECTIONS_FILE_PATH = '../src/sections/esql_documentation_sections.tsx';

// Type definitions for AST nodes
interface ASTProperty {
  key: recast.types.namedTypes.Identifier;
  value: recast.types.namedTypes.Node;
}

interface ASTObjectExpression {
  type: 'ObjectExpression';
  properties: ASTProperty[];
}

interface LicenseInfo {
  name: string;
}

/**
 * Creates a LicenseInfo object from a license name.
 */
function createCommandLicenseInfo(licenseName: string | undefined): LicenseInfo | undefined {
  if (!licenseName) {
    return undefined;
  }

  return {
    name: licenseName,
  };
}

(function () {
  const pathToElasticsearch = process.argv[2];
  if (!pathToElasticsearch) {
    throw new Error('Path to Elasticsearch must be provided as the first argument.');
  }

  // Load command definitions
  const commandDefinitions = loadCommandDefinitions(pathToElasticsearch);
  // Update the esql_documentation_sections.tsx file with license info
  updateDocumentationSections(commandDefinitions);
})();

/**
 * Loads command definitions from the specified path.
 * Returns a map of command names to their definitions.
 */
function loadCommandDefinitions(basePath: string): Map<string, ElasticsearchCommandDefinition> {
  const commandsPath = path.join(basePath, COMMANDS_DEFINITION_PATH);

  const commandDefinitions = new Map<string, ElasticsearchCommandDefinition>();

  try {
    const files = fs.readdirSync(commandsPath);

    // Read each JSON file from elasticsearch and parse its content
    files.forEach((file) => {
      if (path.extname(file) === '.json') {
        const filePath = path.join(commandsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const commandDef: ElasticsearchCommandDefinition = JSON.parse(content);

        commandDefinitions.set(commandDef.name, commandDef);
      }
    });
  } catch (error) {
    console.warn(
      `Warning: Could not load command definitions from ${commandsPath}: ${error.message}`
    );
  }

  return commandDefinitions;
}

/**
 * Updates the command section in the AST with license information.
 * It finds the section by name and updates each command item with its license info.
 */
function updateCommandSection(
  ast: recast.types.namedTypes.File,
  sectionName: string,
  commandDefinitions: Map<string, ElasticsearchCommandDefinition>
) {
  recast.visit(ast, {
    visitVariableDeclarator(astPath) {
      if (n.Identifier.check(astPath.node.id) && astPath.node.id.name === sectionName) {
        // Find the items array in the section
        if (astPath.node.init) {
          recast.visit(astPath.node.init, {
            visitObjectProperty(objectPath) {
              // Check if the property is 'items' and is an array
              if (
                n.Identifier.check(objectPath.node.key) &&
                objectPath.node.key.name === 'items' &&
                n.ArrayExpression.check(objectPath.node.value)
              ) {
                // Update each item in the array
                objectPath.node.value.elements.forEach((element) => {
                  if (element && n.ObjectExpression.check(element)) {
                    updateCommandItem(
                      element as unknown as ASTObjectExpression,
                      commandDefinitions
                    );
                  }
                });
                return false;
              }
              // Continue traversing the AST
              return this.traverse(objectPath);
            },
          });
        }
        // Stop traversing further as we found the section
        return false;
      }
      return this.traverse(astPath);
    },
  });
}

/**
 * Updates the esql_documentation_sections.tsx file with command license information.
 * It reads the file, updates the command items with license info, and writes it back.
 */
function updateDocumentationSections(
  commandDefinitions: Map<string, ElasticsearchCommandDefinition>
) {
  const sectionsFilePath = path.join(__dirname, SECTIONS_FILE_PATH);
  const content = fs.readFileSync(sectionsFilePath, 'utf-8');

  const ast = recast.parse(content, {
    parser: require('recast/parsers/babel'),
  });

  // Find and update sourceCommands and processingCommands
  updateCommandSection(ast, 'sourceCommands', commandDefinitions);
  updateCommandSection(ast, 'processingCommands', commandDefinitions);

  const newContent = recast.print(ast);
  fs.writeFileSync(sectionsFilePath, newContent.code);

  console.log(
    'Successfully updated esql_documentation_sections.tsx with command license information'
  );
}

function createCommandMapping(
  commandDefinitions: Map<string, ElasticsearchCommandDefinition>
): Record<string, string> {
  const mapping: Record<string, string> = {};

  // Create mapping from display names to internal names
  for (const internalName of commandDefinitions.keys()) {
    mapping[internalName.toLowerCase()] = internalName;
    mapping[internalName] = internalName;
  }

  // Handle special display name cases
  mapping['stats ... by'] = 'stats';
  mapping['lookup join'] = 'lookup';

  return mapping;
}

function extractCommandName(itemObject: ASTObjectExpression): string {
  const labelProp = itemObject.properties.find(
    (prop: ASTProperty) =>
      n.Identifier.check(prop.key) &&
      prop.key.name === 'label' &&
      n.CallExpression.check(prop.value)
  );

  if (labelProp?.value.arguments?.[1]?.properties) {
    const defaultMessageProp = labelProp.value.arguments[1].properties.find(
      (p: ASTProperty) => n.Identifier.check(p.key) && p.key.name === 'defaultMessage'
    );

    if (n.StringLiteral.check(defaultMessageProp?.value)) {
      return defaultMessageProp.value.value.toLowerCase();
    }
  }

  return '';
}

function updateCommandItem(
  itemObject: ASTObjectExpression,
  commandDefinitions: Map<string, ElasticsearchCommandDefinition>
) {
  const commandName = extractCommandName(itemObject);
  const commandMapping = createCommandMapping(commandDefinitions);
  const internalCommandName = commandMapping[commandName] || commandName;
  const commandDef = commandDefinitions.get(internalCommandName);

  if (commandDef && commandDef.license) {
    // Check if license property already exists
    const licenseProperty = itemObject.properties.find(
      (prop: ASTProperty) => n.Identifier.check(prop.key) && prop.key.name === 'license'
    );

    const licenseInfo = createCommandLicenseInfo(commandDef.license);

    if (licenseProperty) {
      // Update existing license property
      if (licenseInfo) {
        const licenseValueAst = recast.parse(`(${JSON.stringify(licenseInfo)})`).program.body[0]
          .expression;
        licenseProperty.value = licenseValueAst;
      } else {
        licenseProperty.value = recast.parse('undefined').program.body[0].expression;
      }
    } else {
      // Add new license property
      const previewProperty = itemObject.properties.find(
        (prop: ASTProperty) => n.Identifier.check(prop.key) && prop.key.name === 'preview'
      );

      let licensePropertyAst;
      if (licenseInfo) {
        const licenseValueAst = recast.parse(`(${JSON.stringify(licenseInfo)})`).program.body[0]
          .expression;
        licensePropertyAst = {
          type: 'ObjectProperty',
          key: { type: 'Identifier', name: 'license' },
          value: licenseValueAst,
          computed: false,
          shorthand: false,
        };
      } else {
        const undefinedAst = recast.parse('undefined').program.body[0].expression;
        licensePropertyAst = {
          type: 'ObjectProperty',
          key: { type: 'Identifier', name: 'license' },
          value: undefinedAst,
          computed: false,
          shorthand: false,
        };
      }

      if (previewProperty) {
        // Insert after preview property
        const previewIndex = itemObject.properties.indexOf(previewProperty);
        itemObject.properties.splice(previewIndex + 1, 0, licensePropertyAst);
      } else {
        // Insert after label property
        const labelProperty = itemObject.properties.find(
          (prop: ASTProperty) => n.Identifier.check(prop.key) && prop.key.name === 'label'
        );
        if (labelProperty) {
          const labelIndex = itemObject.properties.indexOf(labelProperty);
          itemObject.properties.splice(labelIndex + 1, 0, licensePropertyAst);
        }
      }
    }
  }
}
