/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { closest, distance } from 'fastest-levenshtein';
import type { WorkflowYaml } from '@kbn/workflows';
import { extractTemplateVariables } from '@kbn/workflows/common/utils';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import { isRecord } from '../../type_guards';
import { getValueAtYamlPath } from '../context/get_value_at_yaml_path';
import { parseVariablePath } from '../parse_variable_path';
import type { VariableItem, YamlValidationResult, YamlValidationResultSecret } from '../types';

type YamlPath = ReadonlyArray<string | number>;

const SECRETS_ROOT = 'secrets';
const SECRETS_PREFIX = `${SECRETS_ROOT}.`;
const STEP_INPUT_KEY = 'with';
// A step type that runs as a connector step but only writes to the execution log.
const CONSOLE_STEP_TYPE = 'console';
// Used when a template cannot be parsed. Finds more than a parser would, never less.
const SECRET_REFERENCE_PATTERN = /\bsecrets\.([A-Za-z_][A-Za-z0-9_]*)/g;

export const SECRET_NOT_ALLOWED_MESSAGE =
  'Secrets can only be used in the inputs ("with") of HTTP and connector steps';
const SECRET_WITHOUT_NAME_MESSAGE = 'A secret is referenced by its name: secrets.<name>';

export interface MisplacedSecretReference {
  /** Empty when the reference names no secret. */
  name: string;
  path: YamlPath;
}

/**
 * Returns the name of the secret that a variable path such as `secrets.api_key` refers to,
 * an empty name for `secrets` alone, and undefined for any other variable.
 */
const getSecretName = (propertyPath: string): string | undefined => {
  if (propertyPath === SECRETS_ROOT) {
    return '';
  }
  return propertyPath.startsWith(SECRETS_PREFIX)
    ? propertyPath.slice(SECRETS_PREFIX.length).split(/[.[]/)[0]
    : undefined;
};

// The key of a `{{ }}` variable can carry filters: `secrets.api_key | upcase`.
const getSecretNameOfVariable = (variableKey: string): string | undefined => {
  // Most variables are not secrets: skip the parsing for them.
  if (!variableKey.includes(SECRETS_ROOT)) {
    return undefined;
  }
  const propertyPath = parseVariablePath(variableKey)?.propertyPath;
  return typeof propertyPath === 'string' ? getSecretName(propertyPath) : undefined;
};

/** Whether the key of a `{{ }}` variable, filters included, refers to a secret. */
export const isSecretReference = (variableKey: string): boolean =>
  getSecretNameOfVariable(variableKey) !== undefined;

// The step whose input (`with`) contains a path: the owner of the outermost `with` that
// belongs to a step. A deeper `with` is part of that step's input.
const getStepNameOfInput = (
  workflowDefinition: WorkflowYaml,
  path: YamlPath
): string | undefined => {
  for (const [index, segment] of path.entries()) {
    const owner =
      segment === STEP_INPUT_KEY
        ? getValueAtYamlPath(workflowDefinition, path.slice(0, index))
        : undefined;
    if (isRecord(owner) && typeof owner.name === 'string' && typeof owner.type === 'string') {
      return owner.name;
    }
  }
  return undefined;
};

/**
 * Whether a secret can be referenced at a path of the workflow: only in the inputs of a step
 * that the execution engine runs as an HTTP or connector step. A step of a type registered
 * by another plugin is accepted too, although it does not resolve secrets: see the known
 * limitations.
 */
export const isSecretAllowedAtPath = ({
  workflowDefinition,
  workflowGraph,
  path,
}: {
  workflowDefinition: WorkflowYaml;
  workflowGraph: WorkflowGraph;
  path: YamlPath;
}): boolean => {
  const stepName = getStepNameOfInput(workflowDefinition, path);
  const stepNode = stepName === undefined ? undefined : workflowGraph.getStepNode(stepName);
  return stepNode?.type === 'atomic' && stepNode.stepType !== CONSOLE_STEP_TYPE;
};

// A typo changes few characters: a name further away than this is another secret.
const MAX_TYPO_DISTANCE = 2;

const getUnknownSecretMessage = (name: string, secretNames: ReadonlySet<string>): string => {
  const message = `No secret named "${name}" exists in this space`;
  const closestName = secretNames.size > 0 ? closest(name, [...secretNames]) : undefined;
  return closestName !== undefined && distance(name, closestName) <= MAX_TYPO_DISTANCE
    ? `${message}. Did you mean "${closestName}"?`
    : message;
};

const getSecretNamesInText = (text: string): string[] => {
  if (!text.includes(SECRETS_ROOT) || !/\{[{%]/.test(text)) {
    return [];
  }
  try {
    return extractTemplateVariables(text).flatMap((variable) => getSecretName(variable) ?? []);
  } catch {
    return [...text.matchAll(SECRET_REFERENCE_PATTERN)].map(([, name]) => name);
  }
};

/**
 * Finds the secrets referenced where the execution engine does not resolve them: anywhere
 * but the inputs of an HTTP or connector step. Reads the parsed workflow, so it is cheap
 * enough to run on every save.
 */
export const findMisplacedSecretReferences = ({
  workflowDefinition,
  workflowGraph,
}: {
  workflowDefinition: WorkflowYaml;
  workflowGraph: WorkflowGraph;
}): MisplacedSecretReference[] => {
  const misplaced: MisplacedSecretReference[] = [];

  const visit = (value: unknown, path: YamlPath): void => {
    if (typeof value === 'string') {
      const names = getSecretNamesInText(value);
      if (names.length > 0 && !isSecretAllowedAtPath({ workflowDefinition, workflowGraph, path })) {
        misplaced.push(...names.map((name) => ({ name, path })));
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, [...path, index]));
    } else if (isRecord(value)) {
      Object.entries(value).forEach(([key, item]) => visit(item, [...path, key]));
    }
  };
  visit(workflowDefinition, []);

  return misplaced;
};

/**
 * Checks the `{{ secrets.<name> }}` variables of a workflow, for the editor. A secret outside
 * the inputs of an HTTP or connector step is an error. A name that is not in `secretNames` is
 * a warning; that check is skipped when the names are not known.
 */
export const validateSecretReferences = ({
  variableItems,
  workflowDefinition,
  workflowGraph,
  secretNames,
}: {
  variableItems: readonly VariableItem[];
  workflowDefinition: WorkflowYaml;
  workflowGraph: WorkflowGraph;
  secretNames?: ReadonlySet<string>;
}): YamlValidationResult[] => {
  const toResult = (
    variableItem: VariableItem,
    rule: Pick<YamlValidationResultSecret, 'ruleId' | 'severity' | 'message'>
  ): YamlValidationResultSecret => ({
    ...variableItem,
    ...rule,
    owner: 'secret-validation',
    hoverMessage: null,
  });

  return variableItems.flatMap<YamlValidationResult>((variableItem) => {
    const name = getSecretNameOfVariable(variableItem.key);
    if (name === undefined) {
      return [];
    }
    const { yamlPath: path } = variableItem;
    if (!isSecretAllowedAtPath({ workflowDefinition, workflowGraph, path })) {
      return toResult(variableItem, {
        ruleId: 'secretNotAllowed',
        severity: 'error',
        message: SECRET_NOT_ALLOWED_MESSAGE,
      });
    }
    if (name === '') {
      return toResult(variableItem, {
        ruleId: 'secretNotAllowed',
        severity: 'error',
        message: SECRET_WITHOUT_NAME_MESSAGE,
      });
    }
    if (secretNames && !secretNames.has(name)) {
      return toResult(variableItem, {
        ruleId: 'unknownSecret',
        severity: 'warning',
        message: getUnknownSecretMessage(name, secretNames),
      });
    }
    return [];
  });
};
