/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import { stringify } from 'yaml';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import { monaco } from '@kbn/monaco';
import { z } from '@kbn/zod/v4';
import { findInsertLineAfterLastStep, findStepRange } from './monaco_edit_utils';
import { setProposalRecord } from './proposal_status_bridge';
import type { ProposalManager } from './proposed_changes';

interface StepDefinition {
  name: string;
  type: string;
  'connector-id'?: string;
  condition?: string;
  foreach?: string;
  with?: Record<string, unknown>;
  output?: Record<string, unknown>;
  steps?: StepDefinition[];
  [key: string]: unknown;
}

export type { BrowserApiToolDefinition };

export interface EditorContext {
  getEditor: () => monaco.editor.IStandaloneCodeEditor | null;
  getYamlDocument: () => Document | null;
  getProposedChangesManager: () => ProposalManager | null;
}

const stepDefinitionToYaml = (step: StepDefinition, indentLevel: number): string => {
  const indent = '  '.repeat(indentLevel);
  const yamlStr = stringify([step], { indent: 2 });
  return yamlStr
    .split('\n')
    .map((line) => (line.trim() === '' ? '' : `${indent}${line}`))
    .join('\n')
    .trimEnd();
};

const normalizeStepYaml = (stepYaml: string, indentLevel: number): string => {
  const indent = '  '.repeat(indentLevel);
  const lines = stepYaml.split('\n');
  let minIndent = Infinity;

  for (const line of lines) {
    if (line.trim() !== '') {
      const leadingSpaces = line.length - line.trimStart().length;
      minIndent = Math.min(minIndent, leadingSpaces);
    }
  }

  if (minIndent === Infinity) minIndent = 0;

  return lines
    .map((line) => {
      if (line.trim() === '') return '';
      return `${indent}${line.slice(minIndent)}`;
    })
    .join('\n')
    .trimEnd();
};

const normalizeYamlIndentation = (yaml: string): string => {
  const lines = yaml.split('\n');
  let minIndent = Infinity;

  for (const line of lines) {
    if (line.trim() !== '') {
      const leadingSpaces = line.length - line.trimStart().length;
      minIndent = Math.min(minIndent, leadingSpaces);
    }
  }

  if (minIndent === Infinity || minIndent === 0) return yaml;

  return lines
    .map((line) => {
      if (line.trim() === '') return '';
      return line.slice(minIndent);
    })
    .join('\n');
};

const stepDefinitionSchema = z.object({
  name: z.string(),
  type: z.string(),
  'connector-id': z.string().optional(),
  condition: z.string().optional(),
  foreach: z.string().optional(),
  with: z.record(z.string(), z.unknown()).optional(),
  output: z.record(z.string(), z.unknown()).optional(),
  steps: z.array(z.record(z.string(), z.unknown())).optional(),
});

const applyDirectEdit = (
  editor: monaco.editor.IStandaloneCodeEditor,
  range: monaco.IRange,
  newText: string
): void => {
  const model = editor.getModel();
  if (!model) return;

  model.pushEditOperations(
    [],
    [
      {
        range: new monaco.Range(
          range.startLineNumber,
          range.startColumn,
          range.endLineNumber,
          range.endColumn
        ),
        text: newText,
      },
    ],
    () => null
  );
};

const getBeforeYaml = (
  editor: monaco.editor.IStandaloneCodeEditor,
  startLine: number,
  endLine: number
): string => {
  const model = editor.getModel();
  if (!model) return '';
  return model.getValueInRange(
    new monaco.Range(startLine, 1, endLine, model.getLineMaxColumn(endLine))
  );
};

export const createInsertStepTool = (
  ctx: EditorContext
): BrowserApiToolDefinition<{
  step: StepDefinition;
  proposalId?: string;
  description?: string;
}> => ({
  id: 'workflow_insert_step',
  description:
    'Insert a new step at the end of the workflow steps list. Provide the step as a structured object.',
  schema: z.object({
    step: stepDefinitionSchema as z.ZodType<StepDefinition>,
    proposalId: z.string().optional(),
    description: z.string().optional(),
  }),
  handler: async ({ step, proposalId, description }) => {
    const editor = ctx.getEditor();
    const yamlDoc = ctx.getYamlDocument();
    const proposedChangesManager = ctx.getProposedChangesManager();
    if (!editor || !yamlDoc) return;

    const model = editor.getModel();
    if (!model) return;

    const insertLine = findInsertLineAfterLastStep(yamlDoc, model);
    if (insertLine === null) return;

    const stepYaml = stepDefinitionToYaml(step, 2);
    const newText = `${stepYaml}\n`;

    const beforeYaml = '';
    const afterYaml = newText;
    const resolvedProposalId = proposalId ?? Date.now().toString();

    if (proposedChangesManager) {
      if (proposalId) {
        setProposalRecord({
          proposalId,
          status: 'pending',
          beforeYaml,
          afterYaml,
          description,
          toolId: 'workflow_insert_step',
        });
      }
      proposedChangesManager.proposeChange({
        proposalId: resolvedProposalId,
        type: 'insert',
        startLine: insertLine,
        endLine: insertLine,
        newText,
      });
    } else {
      const range = new monaco.Range(insertLine, 1, insertLine, 1);
      applyDirectEdit(editor, range, newText);
    }
  },
});

export const createModifyStepTool = (
  ctx: EditorContext
): BrowserApiToolDefinition<{
  stepName: string;
  updatedStep: StepDefinition;
  proposalId?: string;
  description?: string;
}> => ({
  id: 'workflow_modify_step',
  description:
    'Replace an entire step by name with a new step definition. The step is identified by its name.',
  schema: z.object({
    stepName: z.string(),
    updatedStep: stepDefinitionSchema as z.ZodType<StepDefinition>,
    proposalId: z.string().optional(),
    description: z.string().optional(),
  }),
  handler: async ({ stepName, updatedStep, proposalId, description }) => {
    const editor = ctx.getEditor();
    const yamlDoc = ctx.getYamlDocument();
    const proposedChangesManager = ctx.getProposedChangesManager();
    if (!editor || !yamlDoc) return;

    const model = editor.getModel();
    if (!model) return;

    const stepRange = findStepRange(yamlDoc, model, stepName);
    if (!stepRange) return;

    const { startLine, endLine, indentLevel } = stepRange;
    const stepYaml = stepDefinitionToYaml(updatedStep, indentLevel);
    const newText = `${stepYaml}\n`;

    const beforeYaml = getBeforeYaml(editor, startLine, endLine);
    const afterYaml = newText;
    const resolvedProposalId = proposalId ?? Date.now().toString();

    if (proposedChangesManager) {
      if (proposalId) {
        setProposalRecord({
          proposalId,
          status: 'pending',
          beforeYaml,
          afterYaml,
          description,
          toolId: 'workflow_modify_step',
        });
      }
      proposedChangesManager.proposeChange({
        proposalId: resolvedProposalId,
        type: 'replace',
        startLine,
        endLine,
        newText,
      });
    } else {
      const range = new monaco.Range(startLine, 1, endLine, model.getLineMaxColumn(endLine));
      applyDirectEdit(editor, range, newText);
    }
  },
});

export const createModifyStepPropertyTool = (
  ctx: EditorContext
): BrowserApiToolDefinition<{
  stepName: string;
  property: string;
  value: unknown;
  proposalId?: string;
  description?: string;
}> => ({
  id: 'workflow_modify_step_property',
  description:
    'Modify a single property of a step identified by name. Provide the property key and new value.',
  schema: z.object({
    stepName: z.string(),
    property: z.string(),
    value: z.unknown(),
    proposalId: z.string().optional(),
    description: z.string().optional(),
  }),
  handler: async ({ stepName, property, value, proposalId, description }) => {
    const editor = ctx.getEditor();
    const yamlDoc = ctx.getYamlDocument();
    const proposedChangesManager = ctx.getProposedChangesManager();
    if (!editor || !yamlDoc) return;

    const model = editor.getModel();
    if (!model) return;

    const stepRange = findStepRange(yamlDoc, model, stepName);
    if (!stepRange) return;

    const { startLine, endLine, indentLevel } = stepRange;
    const currentYaml = getBeforeYaml(editor, startLine, endLine);
    const normalizedYaml = normalizeYamlIndentation(currentYaml);

    const lines = normalizedYaml.split('\n');
    const updatedLines: string[] = [];
    let found = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(new RegExp(`^(\\s*- )?\\s*${property}\\s*:`));
      if (match && !found) {
        found = true;
        const prefix = line.match(/^(\s*(?:- )?)/)?.[1] ?? '';
        const valueYaml = stringify({ [property]: value }, { indent: 2 }).trim();
        updatedLines.push(`${prefix}${valueYaml}`);
      } else {
        updatedLines.push(line);
      }
    }

    if (!found) {
      const indent = '  '.repeat(indentLevel + 1);
      const valueYaml = stringify({ [property]: value }, { indent: 2 }).trim();
      updatedLines.push(`${indent}${valueYaml}`);
    }

    const newText = `${normalizeStepYaml(updatedLines.join('\n'), indentLevel)}\n`;
    const beforeYaml = currentYaml;
    const afterYaml = newText;
    const resolvedProposalId = proposalId ?? Date.now().toString();

    if (proposedChangesManager) {
      if (proposalId) {
        setProposalRecord({
          proposalId,
          status: 'pending',
          beforeYaml,
          afterYaml,
          description,
          toolId: 'workflow_modify_step_property',
        });
      }
      proposedChangesManager.proposeChange({
        proposalId: resolvedProposalId,
        type: 'replace',
        startLine,
        endLine,
        newText,
      });
    } else {
      const range = new monaco.Range(startLine, 1, endLine, model.getLineMaxColumn(endLine));
      applyDirectEdit(editor, range, newText);
    }
  },
});

export const createModifyWorkflowPropertyTool = (
  ctx: EditorContext
): BrowserApiToolDefinition<{
  property: string;
  value: unknown;
  proposalId?: string;
  description?: string;
}> => ({
  id: 'workflow_modify_property',
  description:
    'Modify a top-level workflow property (e.g. name, description, trigger). Provide the property key and new value.',
  schema: z.object({
    property: z.string(),
    value: z.unknown(),
    proposalId: z.string().optional(),
    description: z.string().optional(),
  }),
  handler: async ({ property, value, proposalId, description }) => {
    const editor = ctx.getEditor();
    const yamlDoc = ctx.getYamlDocument();
    const proposedChangesManager = ctx.getProposedChangesManager();
    if (!editor || !yamlDoc) return;

    const model = editor.getModel();
    if (!model) return;

    const fullContent = model.getValue();
    const lines = fullContent.split('\n');
    let targetLineStart = -1;
    let targetLineEnd = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(new RegExp(`^${property}\\s*:`))) {
        targetLineStart = i + 1;
        targetLineEnd = i + 1;

        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          if (nextLine.trim() === '' || /^\s+/.test(nextLine)) {
            targetLineEnd = j + 1;
          } else {
            break;
          }
        }
        break;
      }
    }

    const valueYaml = stringify({ [property]: value }, { indent: 2 }).trimEnd();

    if (targetLineStart === -1) {
      const newText = `${valueYaml}\n`;
      const lastLine = model.getLineCount();
      const afterYaml = newText;
      const resolvedProposalId = proposalId ?? Date.now().toString();

      if (proposedChangesManager) {
        if (proposalId) {
          setProposalRecord({
            proposalId,
            status: 'pending',
            beforeYaml: '',
            afterYaml,
            description,
            toolId: 'workflow_modify_property',
          });
        }
        proposedChangesManager.proposeChange({
          proposalId: resolvedProposalId,
          type: 'insert',
          startLine: lastLine + 1,
          endLine: lastLine + 1,
          newText,
        });
      } else {
        const range = new monaco.Range(
          lastLine,
          model.getLineMaxColumn(lastLine),
          lastLine,
          model.getLineMaxColumn(lastLine)
        );
        applyDirectEdit(editor, range, `\n${valueYaml}`);
      }
    } else {
      const newText = `${valueYaml}\n`;
      const beforeYaml = getBeforeYaml(editor, targetLineStart, targetLineEnd);
      const afterYaml = newText;
      const resolvedProposalId = proposalId ?? Date.now().toString();

      if (proposedChangesManager) {
        if (proposalId) {
          setProposalRecord({
            proposalId,
            status: 'pending',
            beforeYaml,
            afterYaml,
            description,
            toolId: 'workflow_modify_property',
          });
        }
        proposedChangesManager.proposeChange({
          proposalId: resolvedProposalId,
          type: 'replace',
          startLine: targetLineStart,
          endLine: targetLineEnd,
          newText,
        });
      } else {
        const range = new monaco.Range(
          targetLineStart,
          1,
          targetLineEnd,
          model.getLineMaxColumn(targetLineEnd)
        );
        applyDirectEdit(editor, range, valueYaml);
      }
    }
  },
});

export const createDeleteStepTool = (
  ctx: EditorContext
): BrowserApiToolDefinition<{
  stepName: string;
  proposalId?: string;
  description?: string;
}> => ({
  id: 'workflow_delete_step',
  description: 'Delete a step from the workflow by its name.',
  schema: z.object({
    stepName: z.string(),
    proposalId: z.string().optional(),
    description: z.string().optional(),
  }),
  handler: async ({ stepName, proposalId, description }) => {
    const editor = ctx.getEditor();
    const yamlDoc = ctx.getYamlDocument();
    const proposedChangesManager = ctx.getProposedChangesManager();
    if (!editor || !yamlDoc) return;

    const model = editor.getModel();
    if (!model) return;

    const stepRange = findStepRange(yamlDoc, model, stepName);
    if (!stepRange) return;

    const { startLine, endLine } = stepRange;
    const beforeYaml = getBeforeYaml(editor, startLine, endLine);
    const afterYaml = '';
    const resolvedProposalId = proposalId ?? Date.now().toString();

    if (proposedChangesManager) {
      if (proposalId) {
        setProposalRecord({
          proposalId,
          status: 'pending',
          beforeYaml,
          afterYaml,
          description,
          toolId: 'workflow_delete_step',
        });
      }
      proposedChangesManager.proposeChange({
        proposalId: resolvedProposalId,
        type: 'delete',
        startLine,
        endLine,
        newText: '',
      });
    } else {
      const range = new monaco.Range(startLine, 1, endLine, model.getLineMaxColumn(endLine));
      applyDirectEdit(editor, range, '');
    }
  },
});

export const createReplaceYamlTool = (
  ctx: EditorContext
): BrowserApiToolDefinition<{
  yaml: string;
  proposalId?: string;
  description?: string;
}> => ({
  id: 'workflow_replace_yaml',
  description:
    'Replace the entire workflow YAML content. Use this for large-scale changes or when multiple properties and steps need to change at once.',
  schema: z.object({
    yaml: z.string(),
    proposalId: z.string().optional(),
    description: z.string().optional(),
  }),
  handler: async ({ yaml, proposalId, description }) => {
    const editor = ctx.getEditor();
    const proposedChangesManager = ctx.getProposedChangesManager();
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    const lastLine = model.getLineCount();
    const beforeYaml = model.getValue();
    const afterYaml = yaml;
    const resolvedProposalId = proposalId ?? Date.now().toString();

    if (proposedChangesManager) {
      if (proposalId) {
        setProposalRecord({
          proposalId,
          status: 'pending',
          beforeYaml,
          afterYaml,
          description,
          toolId: 'workflow_replace_yaml',
        });
      }
      proposedChangesManager.proposeChange({
        proposalId: resolvedProposalId,
        type: 'replace',
        startLine: 1,
        endLine: lastLine,
        newText: yaml,
      });
    } else {
      const range = new monaco.Range(1, 1, lastLine, model.getLineMaxColumn(lastLine));
      applyDirectEdit(editor, range, yaml);
    }
  },
});
