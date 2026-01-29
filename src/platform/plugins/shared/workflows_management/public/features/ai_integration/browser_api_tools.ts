/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import { parseDocument, stringify } from 'yaml';
import { monaco } from '@kbn/monaco';
import { z } from '@kbn/zod';
import type { ZodSchema } from '@kbn/zod';
import { findInsertLineAfterLastStep, findStepRange } from './monaco_edit_utils';
import type { ProposedChangesManager } from './proposed_changes';

/**
 * Structured step definition for type-safe step creation.
 * The LLM returns this structure and we generate proper YAML from it.
 */
interface StepDefinition {
  name: string;
  type: string;
  'connector-id'?: string;
  condition?: string;
  foreach?: string;
  with?: Record<string, unknown>;
  output?: Record<string, unknown>;
  steps?: StepDefinition[]; // For if/foreach nested steps
  [key: string]: unknown; // Allow additional properties
}

/**
 * Convert a structured step definition to properly formatted YAML.
 * This ensures correct indentation without relying on LLM-generated YAML.
 */
function stepDefinitionToYaml(step: StepDefinition, indentLevel: number): string {
  // Use yaml library's stringify with proper formatting
  const yamlContent = stringify([step], {
    indent: 2,
    lineWidth: 0, // Don't wrap lines
    defaultStringType: 'QUOTE_SINGLE', // Use single quotes for strings
    defaultKeyType: 'PLAIN', // Keys without quotes
  });

  // The stringify produces a list item, apply the target indent level
  const lines = yamlContent.split('\n').filter((line) => line.trim().length > 0);

  return lines
    .map((line, index) => {
      // The first line starts with "- ", keep it and add target indent
      if (index === 0) {
        return ' '.repeat(indentLevel) + line.trimStart();
      }
      // Subsequent lines - calculate their relative indent and apply target indent
      const originalIndent = line.match(/^(\s*)/)?.[1]?.length ?? 0;
      // Lines after "- " in yaml stringify are indented by 2 relative to the "-"
      // We need to add (indentLevel + 2) as base, then preserve any additional nesting
      const relativeIndent = Math.max(0, originalIndent - 2);
      return ' '.repeat(indentLevel + 2 + relativeIndent) + line.trimStart();
    })
    .join('\n');
}

/**
 * Validate that step YAML has valid structure.
 * Returns null if valid, or an error message if invalid.
 * Note: This validates AFTER normalization is applied.
 */
function validateStepYaml(stepYaml: string): string | null {
  try {
    // First, check if it's valid YAML
    const doc = parseDocument(stepYaml);
    if (doc.errors.length > 0) {
      return `Invalid YAML syntax: ${doc.errors[0].message}`;
    }

    // Parse as a list item to validate structure
    const asListItem = stepYaml.trim().startsWith('-')
      ? stepYaml
      : `- ${stepYaml.split('\n').join('\n  ')}`;

    const listDoc = parseDocument(asListItem);
    if (listDoc.errors.length > 0) {
      return `Invalid YAML structure: ${listDoc.errors[0].message}`;
    }

    const content = listDoc.toJS();
    if (!Array.isArray(content) || content.length === 0) {
      return 'Step YAML must represent a single step';
    }

    const step = content[0];
    if (typeof step !== 'object' || step === null) {
      return 'Step must be an object with name and type';
    }

    // Check required fields
    if (!step.name) {
      return 'Step must have a "name" field';
    }
    if (!step.type) {
      return 'Step must have a "type" field';
    }

    return null; // Valid
  } catch (error) {
    return `Failed to parse YAML: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Validate step YAML after normalization and return any validation error.
 * This is called during the tool handlers to ensure the AI-generated YAML is valid.
 */
function validateNormalizedStepYaml(stepYaml: string, indentLevel: number): string | null {
  try {
    // Normalize the YAML first (same as what normalizeStepYaml does)
    const normalizedYaml = normalizeStepYaml(stepYaml, indentLevel);

    // Try to parse it as valid YAML
    const doc = parseDocument(normalizedYaml);
    if (doc.errors.length > 0) {
      return `Invalid YAML after normalization: ${doc.errors[0].message}`;
    }

    return null;
  } catch (error) {
    return `Failed to validate YAML: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Browser API tool definition interface.
 * Defined here to avoid importing from @kbn/agent-builder-browser which would cause circular deps.
 */
export interface BrowserApiToolDefinition<TParams = unknown> {
  id: string;
  description: string;
  schema: ZodSchema<TParams>;
  handler: (params: TParams) => void | Promise<void>;
}

/**
 * Context object providing access to the Monaco editor and YAML document.
 * Uses getter functions to always access the current state.
 */
export interface EditorContext {
  getEditor: () => monaco.editor.IStandaloneCodeEditor | null;
  getYamlDocument: () => Document | null;
  getProposedChangesManager: () => ProposedChangesManager | null;
}

/**
 * Normalize step YAML to have correct indentation for the target location.
 *
 * The LLM might provide YAML like:
 * ```
 * name: my_step
 * type: slack
 * with:
 *   message: "hello"
 * ```
 *
 * We need to transform it to proper list item format:
 * ```
 *   - name: my_step
 *     type: slack
 *     with:
 *       message: "hello"
 * ```
 *
 * Key insight: After adding "- " to the first line, ALL subsequent lines
 * need to be indented by 2 more spaces to align under the first property,
 * while preserving their relative indentation to each other.
 */
/**
 * Normalizes step YAML to have consistent indentation.
 * First, strips all leading whitespace and re-indents based on YAML structure.
 * Then applies the target indentLevel for insertion into the document.
 *
 * This handles cases where the AI provides inconsistently indented YAML.
 */
function normalizeStepYaml(stepYaml: string, indentLevel: number): string {
  const trimmed = stepYaml.trim();
  if (!trimmed) return '';

  // First, normalize the YAML structure by stripping all indentation and re-building
  const normalizedLines = normalizeYamlIndentation(trimmed);

  const lines = normalizedLines.split('\n');
  const firstLine = lines[0];

  // Check if the YAML already starts with "- " (list item format)
  const listMarkerMatch = firstLine.match(/^(\s*)-\s/);
  const alreadyHasListMarker = listMarkerMatch !== null;

  if (alreadyHasListMarker) {
    // Already in list format - normalize to target indent level
    const markerIndent = listMarkerMatch[1].length;
    const contentBaseIndent = markerIndent + 2;

    return lines
      .map((line, index) => {
        if (line.trim().length === 0) return '';

        const currentLineIndent = line.match(/^(\s*)/)?.[1]?.length ?? 0;

        if (index === 0) {
          return ' '.repeat(indentLevel) + line.substring(markerIndent);
        } else {
          const relativeIndent = Math.max(0, currentLineIndent - contentBaseIndent);
          return ' '.repeat(indentLevel + 2 + relativeIndent) + line.trimStart();
        }
      })
      .join('\n');
  } else {
    // Not in list format - need to add "- " prefix
    const result = lines
      .map((line, index) => {
        if (line.trim().length === 0) return '';

        const currentLineIndent = line.match(/^(\s*)/)?.[1]?.length ?? 0;
        const content = line.trimStart();

        if (index === 0) {
          // First line: add "- " prefix at target indent
          return `${' '.repeat(indentLevel)}- ${content}`;
        } else {
          // Subsequent lines: target indent + 2 (for "- ") + current indent
          // Current indent is already normalized, so use it directly
          return ' '.repeat(indentLevel + 2 + currentLineIndent) + content;
        }
      })
      .join('\n');

    return result;
  }
}

/**
 * Normalize YAML indentation by analyzing the structure and re-indenting consistently.
 * This handles cases where the AI provides YAML with incorrect indentation.
 *
 * Rules:
 * - Top-level step properties (name, type, with, etc.) should have 0 indentation
 * - Properties nested under a mapping (like "with:") should have 2-space indentation
 * - Preserves deeper nesting levels
 */
function normalizeYamlIndentation(yaml: string): string {
  const lines = yaml.split('\n');
  const result: string[] = [];

  // Known top-level step properties - these should always be at indent 0
  const TOP_LEVEL_PROPERTIES = new Set([
    'name',
    'type',
    'with',
    'connector-id',
    'id',
    'description',
    'condition',
    'foreach',
    'retry',
    'timeout',
    'on-error',
    'output',
    'steps', // for nested steps in if/foreach
  ]);

  // Track the current indent level and whether we expect nested content
  let currentIndent = 0;
  let expectsNested = false;
  let nestedUnderIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (trimmedLine.length === 0) {
      result.push('');
    } else {
      // Check if this line is a key-value pair (key: value or key:)
      const keyMatch = trimmedLine.match(/^([a-zA-Z_-]+)\s*:/);
      const keyName = keyMatch ? keyMatch[1] : null;
      // Check if this line ends with ":" only (mapping that expects nested content)
      const isMapping = keyMatch && /^[a-zA-Z_-]+\s*:\s*$/.test(trimmedLine);
      // Check if this line is a list item
      const isListItem = trimmedLine.startsWith('- ');

      // Determine the target indent
      let targetIndent: number;

      // Check if this is a known top-level property
      const isTopLevelProperty = keyName !== null && TOP_LEVEL_PROPERTIES.has(keyName);

      if (isTopLevelProperty) {
        // Top-level properties always go at indent 0
        targetIndent = 0;
        currentIndent = 0;
        expectsNested = false;
      } else if (expectsNested) {
        // Previous line was a mapping (ended with ":"), so this should be nested
        targetIndent = nestedUnderIndent + 2;
        currentIndent = targetIndent;
        expectsNested = false; // Only the first nested line triggers this
      } else {
        // Continue at current indent level
        targetIndent = currentIndent;
      }

      // Output the line with normalized indentation
      result.push(' '.repeat(targetIndent) + trimmedLine);

      // If this line is a mapping (ends with ":"), expect nested content next
      if (isMapping) {
        expectsNested = true;
        nestedUnderIndent = targetIndent;
      }

      // Suppress unused variable warning - isListItem is used for future extensibility
      void isListItem;
    }
  }

  // Debug logging
  return result.join('\n');
}

/**
 * Zod schema for the step "with" parameters - allows nested objects and arrays.
 */
const stepWithSchema: z.ZodType<Record<string, unknown>> = z.record(
  z.union([z.string(), z.number(), z.boolean(), z.array(z.unknown()), z.lazy(() => stepWithSchema)])
);

/**
 * Tool to insert a new step into the workflow using structured input.
 * The LLM provides a JSON object, and we generate properly formatted YAML.
 * This approach eliminates YAML indentation errors from LLM output.
 */
export const createInsertStepTool = (
  ctx: EditorContext
): BrowserApiToolDefinition<{
  step: {
    name: string;
    type: string;
    'connector-id'?: string;
    condition?: string;
    foreach?: string;
    with?: Record<string, unknown>;
    output?: Record<string, unknown>;
  };
  afterStepName?: string;
  position?: 'cursor' | 'end';
}> => ({
  id: 'workflow_insert_step',
  description:
    'Insert a new workflow step. Provide step properties as a structured object (NOT as YAML string). Shows the proposed change for user to accept (Tab/Enter) or reject (Escape).',
  schema: z.object({
    step: z
      .object({
        name: z.string().describe('Unique name for the step (e.g., "send_slack_message")'),
        type: z
          .string()
          .describe('Step type (e.g., "slack", "ai.prompt", "data.set", "http", "if", "foreach")'),
        'connector-id': z
          .string()
          .optional()
          .describe('Connector ID for connector-based steps (e.g., "my-slack-connector")'),
        condition: z
          .string()
          .optional()
          .describe('Condition expression for if steps (e.g., "variables.count > 0")'),
        foreach: z
          .string()
          .optional()
          .describe('Foreach expression (e.g., "[1,2,3]" or "variables.items")'),
        with: stepWithSchema
          .optional()
          .describe(
            'Step parameters as key-value pairs. For slack: {message, channel}. For ai.prompt: {prompt, connector-id}. For data.set: {key: value pairs}.'
          ),
        output: z
          .record(z.string())
          .optional()
          .describe('Output mappings from step result to variables'),
      })
      .passthrough() // Allow additional properties
      .describe('The step definition as a structured object'),
    afterStepName: z.string().optional().describe('Insert after this step name'),
    position: z
      .enum(['cursor', 'end'])
      .optional()
      .describe('Where to insert if afterStepName not provided. Defaults to "end".'),
  }),
  handler: async ({ step, afterStepName, position = 'end' }) => {
    const editor = ctx.getEditor();
    const yamlDoc = ctx.getYamlDocument();
    const proposedChangesManager = ctx.getProposedChangesManager();
    const model = editor?.getModel();

    if (!editor || !model || !yamlDoc) {
      // eslint-disable-next-line no-console
      console.warn('[workflow_insert_step] Editor, model, or YAML document not available');
      return;
    }

    // Validate required fields
    if (!step.name || !step.type) {
      // eslint-disable-next-line no-console
      console.error('[workflow_insert_step] Step must have name and type');
      return;
    }

    let insertLineNumber: number;
    let indentLevel = 2; // Default indent for steps

    if (afterStepName) {
      const stepRange = findStepRange(yamlDoc, model, afterStepName);
      if (stepRange) {
        insertLineNumber = stepRange.endLine + 1;
        indentLevel = stepRange.indentLevel;
      } else {
        // eslint-disable-next-line no-console
        console.warn(`[workflow_insert_step] Step "${afterStepName}" not found, inserting at end`);
        const { lineNumber, indentLevel: defaultIndent } = findInsertLineAfterLastStep(
          yamlDoc,
          model
        );
        insertLineNumber = lineNumber;
        indentLevel = defaultIndent;
      }
    } else if (position === 'cursor') {
      const cursorPos = editor.getPosition();
      insertLineNumber = cursorPos ? cursorPos.lineNumber + 1 : model.getLineCount() + 1;
    } else {
      const { lineNumber, indentLevel: defaultIndent } = findInsertLineAfterLastStep(
        yamlDoc,
        model
      );
      insertLineNumber = lineNumber;
      indentLevel = defaultIndent;
    }

    // Convert structured step to YAML using the yaml library
    const formattedYaml = stepDefinitionToYaml(step as StepDefinition, indentLevel);

    // Log the formatted YAML for debugging
    // eslint-disable-next-line no-console
    console.debug('[workflow_insert_step] Step object:', step);
    // eslint-disable-next-line no-console
    console.debug(`[workflow_insert_step] Formatted YAML:\n${formattedYaml}`);

    // If we have a proposed changes manager, show the change for approval
    if (proposedChangesManager) {
      proposedChangesManager.proposeChange({
        type: 'insert',
        startLine: insertLineNumber,
        newText: `${formattedYaml}\n`,
        description: `Insert new step`,
      });
    } else {
      // Fallback: direct edit (for backwards compatibility)
      // eslint-disable-next-line no-console
      console.warn('[workflow_insert_step] No ProposedChangesManager, applying directly');
      editor.pushUndoStop();
      model.pushEditOperations(
        null,
        [
          {
            range: new monaco.Range(insertLineNumber, 1, insertLineNumber, 1),
            text: `${formattedYaml}\n`,
          },
        ],
        () => null
      );
      editor.pushUndoStop();
      editor.revealLineInCenter(insertLineNumber);
    }
  },
});

/**
 * Tool to modify an existing step by name using structured input.
 * The LLM provides a JSON object, and we generate properly formatted YAML.
 */
export const createModifyStepTool = (
  ctx: EditorContext
): BrowserApiToolDefinition<{
  stepName: string;
  newStep: {
    name: string;
    type: string;
    'connector-id'?: string;
    condition?: string;
    foreach?: string;
    with?: Record<string, unknown>;
    output?: Record<string, unknown>;
  };
}> => ({
  id: 'workflow_modify_step',
  description:
    'Modify an existing step in the workflow by replacing it entirely. Provide the new step as a structured object (NOT as YAML string). Use this when multiple properties need to change. For single property changes, prefer workflow_modify_step_property instead.',
  schema: z.object({
    stepName: z.string().describe('Name of the existing step to modify'),
    newStep: z
      .object({
        name: z.string().describe('New name for the step (can be same as current)'),
        type: z.string().describe('Step type'),
        'connector-id': z.string().optional().describe('Connector ID if needed'),
        condition: z.string().optional().describe('Condition expression for if steps'),
        foreach: z.string().optional().describe('Foreach expression'),
        with: stepWithSchema.optional().describe('Step parameters as key-value pairs'),
        output: z.record(z.string()).optional().describe('Output mappings'),
      })
      .passthrough()
      .describe('The complete new step definition as a structured object'),
  }),
  handler: async ({ stepName, newStep }) => {
    const editor = ctx.getEditor();
    const yamlDoc = ctx.getYamlDocument();
    const proposedChangesManager = ctx.getProposedChangesManager();
    const model = editor?.getModel();

    if (!editor || !model || !yamlDoc) {
      // eslint-disable-next-line no-console
      console.warn('[workflow_modify_step] Editor, model, or YAML document not available');
      return;
    }

    // Validate required fields
    if (!newStep.name || !newStep.type) {
      // eslint-disable-next-line no-console
      console.error('[workflow_modify_step] Step must have name and type');
      return;
    }

    const stepRange = findStepRange(yamlDoc, model, stepName);

    if (!stepRange) {
      // eslint-disable-next-line no-console
      console.warn(`[workflow_modify_step] Step "${stepName}" not found`);
      return;
    }

    // Convert structured step to YAML
    const formattedYaml = stepDefinitionToYaml(newStep as StepDefinition, stepRange.indentLevel);

    // Log for debugging
    // eslint-disable-next-line no-console
    console.debug('[workflow_modify_step] New step object:', newStep);
    // eslint-disable-next-line no-console
    console.debug(`[workflow_modify_step] Formatted YAML:\n${formattedYaml}`);

    if (proposedChangesManager) {
      proposedChangesManager.proposeChange({
        type: 'replace',
        startLine: stepRange.startLine,
        endLine: stepRange.endLine,
        newText: formattedYaml,
        description: `Modify step "${stepName}"`,
      });
    } else {
      // Fallback: direct edit
      // eslint-disable-next-line no-console
      console.warn('[workflow_modify_step] No ProposedChangesManager, applying directly');
      const endColumn = model.getLineMaxColumn(stepRange.endLine);
      editor.pushUndoStop();
      model.pushEditOperations(
        null,
        [
          {
            range: new monaco.Range(stepRange.startLine, 1, stepRange.endLine, endColumn),
            text: formattedYaml,
          },
        ],
        () => null
      );
      editor.pushUndoStop();
      editor.revealLineInCenter(stepRange.startLine);
    }
  },
});

/**
 * Tool to modify a single property within a step.
 * This is more surgical than modifying the entire step - only changes one line.
 */
export const createModifyStepPropertyTool = (
  ctx: EditorContext
): BrowserApiToolDefinition<{
  stepName: string;
  propertyName: string;
  newValue: string;
}> => ({
  id: 'workflow_modify_step_property',
  description:
    'Modify a single property within a step. Use this for small changes like updating a value, changing an iteration count, or modifying a condition. This is preferred over workflow_modify_step when only one property needs to change. Shows the proposed change for user to accept (Tab/Enter) or reject (Escape).',
  schema: z.object({
    stepName: z.string().describe('Name of the step containing the property'),
    propertyName: z
      .string()
      .describe(
        'Name of the property to modify (e.g., "foreach", "condition", "type", "connector-id")'
      ),
    newValue: z
      .string()
      .describe(
        'The new value for the property. Include quotes if needed for YAML strings (e.g., "\'[1,2,3,4,5]\'" or "\'not variables.done\'")'
      ),
  }),
  handler: async ({ stepName, propertyName, newValue }) => {
    const editor = ctx.getEditor();
    const yamlDoc = ctx.getYamlDocument();
    const proposedChangesManager = ctx.getProposedChangesManager();
    const model = editor?.getModel();

    if (!editor || !model || !yamlDoc) {
      // eslint-disable-next-line no-console
      console.warn('[workflow_modify_step_property] Editor, model, or YAML document not available');
      return;
    }

    // Find the step
    const stepRange = findStepRange(yamlDoc, model, stepName);
    if (!stepRange) {
      // eslint-disable-next-line no-console
      console.warn(`[workflow_modify_step_property] Step "${stepName}" not found`);
      return;
    }

    // Search for the property within the step's line range
    let propertyLineNumber: number | null = null;
    let propertyIndent = 0;

    for (let lineNum = stepRange.startLine; lineNum <= stepRange.endLine; lineNum++) {
      const lineContent = model.getLineContent(lineNum);
      // Match property: value pattern, accounting for indentation
      const propertyMatch = lineContent.match(new RegExp(`^(\\s*)${propertyName}\\s*:`));
      if (propertyMatch) {
        propertyLineNumber = lineNum;
        propertyIndent = propertyMatch[1].length;
        break;
      }
    }

    if (propertyLineNumber === null) {
      // eslint-disable-next-line no-console
      console.warn(
        `[workflow_modify_step_property] Property "${propertyName}" not found in step "${stepName}"`
      );
      return;
    }

    // Construct the new line with proper indentation
    const newLine = `${' '.repeat(propertyIndent) + propertyName}: ${newValue}`;

    // Log for debugging
    // eslint-disable-next-line no-console
    console.debug(
      `[workflow_modify_step_property] Changing line ${propertyLineNumber}: "${model.getLineContent(
        propertyLineNumber
      )}" -> "${newLine}"`
    );

    if (proposedChangesManager) {
      proposedChangesManager.proposeChange({
        type: 'replace',
        startLine: propertyLineNumber,
        endLine: propertyLineNumber,
        newText: newLine,
        description: `Change ${propertyName} in step "${stepName}"`,
      });
    } else {
      // Fallback: direct edit
      // eslint-disable-next-line no-console
      console.warn('[workflow_modify_step_property] No ProposedChangesManager, applying directly');
      const endColumn = model.getLineMaxColumn(propertyLineNumber);
      editor.pushUndoStop();
      model.pushEditOperations(
        null,
        [
          {
            range: new monaco.Range(propertyLineNumber, 1, propertyLineNumber, endColumn),
            text: newLine,
          },
        ],
        () => null
      );
      editor.pushUndoStop();
      editor.revealLineInCenter(propertyLineNumber);
    }
  },
});

/**
 * Tool to delete a step by name.
 * Shows proposed deletion for user to accept/reject before applying.
 */
export const createDeleteStepTool = (
  ctx: EditorContext
): BrowserApiToolDefinition<{
  stepName: string;
}> => ({
  id: 'workflow_delete_step',
  description:
    'Delete a step from the workflow by its name. Shows the proposed deletion for user to accept (Tab/Enter) or reject (Escape).',
  schema: z.object({
    stepName: z.string().describe('Name of the step to delete'),
  }),
  handler: async ({ stepName }) => {
    const editor = ctx.getEditor();
    const yamlDoc = ctx.getYamlDocument();
    const proposedChangesManager = ctx.getProposedChangesManager();
    const model = editor?.getModel();

    if (!editor || !model || !yamlDoc) {
      // eslint-disable-next-line no-console
      console.warn('[workflow_delete_step] Editor, model, or YAML document not available');
      return;
    }

    const stepRange = findStepRange(yamlDoc, model, stepName);

    if (!stepRange) {
      // eslint-disable-next-line no-console
      console.warn(`[workflow_delete_step] Step "${stepName}" not found`);
      return;
    }

    if (proposedChangesManager) {
      proposedChangesManager.proposeChange({
        type: 'delete',
        startLine: stepRange.startLine,
        endLine: stepRange.endLine,
        newText: '', // Empty for deletion
        description: `Delete step "${stepName}"`,
      });
    } else {
      // Fallback: direct delete
      // eslint-disable-next-line no-console
      console.warn('[workflow_delete_step] No ProposedChangesManager, applying directly');
      const endLineMax = model.getLineCount();
      const endColumn =
        stepRange.endLine < endLineMax ? 1 : model.getLineMaxColumn(stepRange.endLine);
      const actualEndLine =
        stepRange.endLine < endLineMax ? stepRange.endLine + 1 : stepRange.endLine;

      editor.pushUndoStop();
      model.pushEditOperations(
        null,
        [
          {
            range: new monaco.Range(stepRange.startLine, 1, actualEndLine, endColumn),
            text: '',
          },
        ],
        () => null
      );
      editor.pushUndoStop();
    }
  },
});

/**
 * Tool for bulk/complex edits - replaces entire YAML.
 * Shows proposed changes for user to accept/reject before applying.
 * Use sparingly - prefer surgical edits when possible.
 */
export const createReplaceYamlTool = (
  ctx: EditorContext
): BrowserApiToolDefinition<{
  yaml: string;
}> => ({
  id: 'workflow_replace_yaml',
  description:
    'Replace the entire workflow YAML content. Shows the proposed change for user to accept (Tab/Enter) or reject (Escape). Use only for major restructuring when surgical edits are not feasible.',
  schema: z.object({
    yaml: z.string().describe('The complete new YAML content for the workflow'),
  }),
  handler: async ({ yaml }) => {
    const editor = ctx.getEditor();
    const proposedChangesManager = ctx.getProposedChangesManager();
    const model = editor?.getModel();

    if (!editor || !model) {
      // eslint-disable-next-line no-console
      console.warn('[workflow_replace_yaml] Editor or model not available');
      return;
    }

    const lastLine = model.getLineCount();

    if (proposedChangesManager) {
      proposedChangesManager.proposeChange({
        type: 'replace',
        startLine: 1,
        endLine: lastLine,
        newText: yaml,
        description: 'Replace entire workflow',
      });
    } else {
      // Fallback: direct edit
      // eslint-disable-next-line no-console
      console.warn('[workflow_replace_yaml] No ProposedChangesManager, applying directly');
      const lastColumn = model.getLineMaxColumn(lastLine);
      editor.pushUndoStop();
      model.pushEditOperations(
        null,
        [
          {
            range: new monaco.Range(1, 1, lastLine, lastColumn),
            text: yaml,
          },
        ],
        () => null
      );
      editor.pushUndoStop();
    }
  },
});
