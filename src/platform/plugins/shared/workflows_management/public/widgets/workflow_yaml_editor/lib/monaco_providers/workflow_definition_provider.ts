/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import YAML from 'yaml';
import { monaco } from '@kbn/monaco';
import type { WorkflowLookup } from '../../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import type { TemplateExpressionInfo } from '../template_expression/parse_template_at_position';
import { parseTemplateAtPosition } from '../template_expression/parse_template_at_position';

interface DefinitionContext {
  model: monaco.editor.ITextModel;
  templateInfo: TemplateExpressionInfo;
  workflowLookup: WorkflowLookup | undefined;
  yamlDocument: YAML.Document | null;
}

type DefinitionResolver = (ctx: DefinitionContext) => monaco.languages.Location | null;

/**
 * Resolve `steps.<name>` — jump to the step's `- name:` line.
 * Triggers on: the step name segment (index 1) or any deeper segment.
 */
const resolveStepDefinition: DefinitionResolver = ({ model, templateInfo, workflowLookup }) => {
  const { pathSegments, cursorSegmentIndex } = templateInfo;
  if (cursorSegmentIndex !== 1 || pathSegments.length < 2) {
    return null;
  }
  const stepInfo = workflowLookup?.steps?.[pathSegments[1]];
  if (!stepInfo) {
    return null;
  }
  return locationFromLine(model, stepInfo.lineStart, pathSegments[1]);
};

/**
 * Resolve `consts.<key>` — jump to the key under `consts:`.
 */
const resolveConstsDefinition: DefinitionResolver = ({ model, templateInfo, yamlDocument }) => {
  if (templateInfo.cursorSegmentIndex !== 1 || templateInfo.pathSegments.length < 2) {
    return null;
  }
  return findYamlMapKeyLocation(model, yamlDocument, 'consts', templateInfo.pathSegments[1]);
};

/**
 * Resolve `inputs.<name>` — jump to `- name: <name>` in the inputs array.
 */
const resolveInputsDefinition: DefinitionResolver = ({ model, templateInfo, yamlDocument }) => {
  if (templateInfo.cursorSegmentIndex !== 1 || templateInfo.pathSegments.length < 2) {
    return null;
  }
  return findArrayItemByName(model, yamlDocument, 'inputs', templateInfo.pathSegments[1]);
};

/**
 * Resolve `variables.<name>` — jump to the data.set step that defines it.
 */
const resolveVariablesDefinition: DefinitionResolver = ({
  model,
  templateInfo,
  workflowLookup,
}) => {
  if (templateInfo.cursorSegmentIndex !== 1 || templateInfo.pathSegments.length < 2) {
    return null;
  }
  const varName = templateInfo.pathSegments[1];
  if (!workflowLookup?.steps) {
    return null;
  }
  for (const stepInfo of Object.values(workflowLookup.steps)) {
    if (stepInfo.stepType === 'data.set' && stepInfo.propInfos[varName]) {
      return locationFromLine(model, stepInfo.lineStart, stepInfo.stepId);
    }
  }
  return null;
};

/**
 * Resolve `foreach` — only the root keyword (segment 0) is navigable.
 * Jumps to the `foreach:` property line of the enclosing foreach step.
 * Sub-properties (foreach.item, foreach.index, etc.) are runtime-only
 * and return null so they're not clickable.
 */
const resolveForeachDefinition: DefinitionResolver = ({ model, templateInfo, workflowLookup }) => {
  if (templateInfo.cursorSegmentIndex !== 0 || !workflowLookup?.steps) {
    return null;
  }

  const cursorLine = templateInfo.templateRange.startLineNumber;
  let bestMatch: (typeof workflowLookup.steps)[string] | null = null;
  for (const stepInfo of Object.values(workflowLookup.steps)) {
    if (
      stepInfo.stepType === 'foreach' &&
      stepInfo.lineStart <= cursorLine &&
      cursorLine <= stepInfo.lineEnd
    ) {
      if (!bestMatch || stepInfo.lineStart > bestMatch.lineStart) {
        bestMatch = stepInfo;
      }
    }
  }
  if (!bestMatch) {
    return null;
  }

  const foreachProp = bestMatch.propInfos.foreach;
  if (foreachProp?.keyNode?.range) {
    const line = model.getPositionAt(foreachProp.keyNode.range[0]).lineNumber;
    return locationFromLine(model, line, 'foreach');
  }
  return locationFromLine(model, bestMatch.lineStart, bestMatch.stepId);
};

/**
 * Registry mapping path prefixes (segment 0) to their definition resolvers.
 * To add go-to-definition for a new context, add an entry here.
 */
const definitionResolvers: Record<string, DefinitionResolver> = {
  steps: resolveStepDefinition,
  consts: resolveConstsDefinition,
  inputs: resolveInputsDefinition,
  variables: resolveVariablesDefinition,
  foreach: resolveForeachDefinition,
};

/**
 * Top-level section names that can be navigated to when hovering on
 * the root keyword itself (segment 0). Maps to the YAML key name.
 */
const rootSectionKeys: Record<string, string> = {
  steps: 'steps',
  consts: 'consts',
  inputs: 'inputs',
  triggers: 'triggers',
};

/**
 * Provides go-to-definition (Cmd+Click / F12) for references inside
 * template expressions. Supports steps, consts, inputs, variables,
 * foreach, and root section navigation.
 */
export class WorkflowDefinitionProvider implements monaco.languages.DefinitionProvider {
  private readonly getWorkflowLookup: () => WorkflowLookup | undefined;
  private readonly getYamlDocument: () => YAML.Document | null;

  constructor(config: {
    getWorkflowLookup: () => WorkflowLookup | undefined;
    getYamlDocument: () => YAML.Document | null;
  }) {
    this.getWorkflowLookup = config.getWorkflowLookup;
    this.getYamlDocument = config.getYamlDocument;
  }

  provideDefinition(
    model: monaco.editor.ITextModel,
    position: monaco.Position
  ): monaco.languages.ProviderResult<monaco.languages.Definition> {
    const templateInfo = parseTemplateAtPosition(model, position);
    if (!templateInfo?.isInsideTemplate || templateInfo.pathSegments.length === 0) {
      return null;
    }

    const ctx: DefinitionContext = {
      model,
      templateInfo,
      workflowLookup: this.getWorkflowLookup(),
      yamlDocument: this.getYamlDocument(),
    };

    const rootKey = templateInfo.pathSegments[0];

    // When cursor is on segment 0 (root keyword), navigate to the section header
    if (templateInfo.cursorSegmentIndex === 0) {
      const sectionKey = rootSectionKeys[rootKey];
      if (sectionKey) {
        return findTopLevelKeyLocation(model, ctx.yamlDocument, sectionKey);
      }
      // foreach at segment 0 — jump to the enclosing foreach step
      if (rootKey === 'foreach') {
        return resolveForeachDefinition(ctx);
      }
      return null;
    }

    const resolver = definitionResolvers[rootKey];
    return resolver ? resolver(ctx) : null;
  }
}

function locationFromLine(
  model: monaco.editor.ITextModel,
  line: number,
  targetText: string
): monaco.languages.Location {
  const lineContent = model.getLineContent(line);
  const idx = lineContent.indexOf(targetText);
  const column = idx >= 0 ? idx + 1 : 1;
  return {
    uri: model.uri,
    range: new monaco.Range(line, column, line, column + targetText.length),
  };
}

function findTopLevelKeyLocation(
  model: monaco.editor.ITextModel,
  yamlDocument: YAML.Document | null,
  keyName: string
): monaco.languages.Location | null {
  if (!yamlDocument || !YAML.isMap(yamlDocument.contents)) {
    return null;
  }
  for (const pair of (yamlDocument.contents as YAML.YAMLMap).items) {
    if (YAML.isScalar(pair.key) && pair.key.value === keyName && pair.key.range) {
      const line = model.getPositionAt(pair.key.range[0]).lineNumber;
      return locationFromLine(model, line, keyName);
    }
  }
  return null;
}

function findYamlMapKeyLocation(
  model: monaco.editor.ITextModel,
  yamlDocument: YAML.Document | null,
  sectionName: string,
  keyName: string
): monaco.languages.Location | null {
  if (!yamlDocument || !YAML.isMap(yamlDocument.contents)) {
    return null;
  }
  const section = (yamlDocument.contents as YAML.YAMLMap).get(sectionName, true);
  if (!YAML.isMap(section)) {
    return null;
  }
  for (const pair of section.items) {
    if (YAML.isScalar(pair.key) && pair.key.value === keyName && pair.key.range) {
      const line = model.getPositionAt(pair.key.range[0]).lineNumber;
      return locationFromLine(model, line, keyName);
    }
  }
  return null;
}

function findArrayItemByName(
  model: monaco.editor.ITextModel,
  yamlDocument: YAML.Document | null,
  sectionName: string,
  itemName: string
): monaco.languages.Location | null {
  if (!yamlDocument || !YAML.isMap(yamlDocument.contents)) {
    return null;
  }
  const section = (yamlDocument.contents as YAML.YAMLMap).get(sectionName, true);
  if (!YAML.isSeq(section)) {
    return null;
  }
  for (const item of section.items) {
    if (YAML.isMap(item)) {
      const nameNode = item.get('name', true);
      if (YAML.isScalar(nameNode) && nameNode.value === itemName && nameNode.range) {
        const line = model.getPositionAt(nameNode.range[0]).lineNumber;
        return locationFromLine(model, line, itemName);
      }
    }
  }
  return null;
}

export function registerWorkflowDefinitionProvider(config: {
  getWorkflowLookup: () => WorkflowLookup | undefined;
  getYamlDocument: () => YAML.Document | null;
}): monaco.IDisposable {
  return monaco.languages.registerDefinitionProvider(
    'yaml',
    new WorkflowDefinitionProvider(config)
  );
}
