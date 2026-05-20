/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { getPathAtOffset, getPathFromAncestors } from '@kbn/workflows/common/utils/yaml';
export {
  getInnermostBlockContainingOffset,
  getStepsAndElseKeyOffsets,
  type BlockKeyInfo,
  type StepsElseKeyOffsets,
} from './get_steps_else_key_offsets';
export { getStepNodeAtPosition } from './get_step_node_at_position';
export { getStepNodesWithType, isStepLikeMap } from './get_step_nodes_with_type';
export { getTriggerNodes, getTriggersPair } from './get_trigger_nodes';
export { getTriggerOnChainOptionPairs } from './get_trigger_on_chain_option_pairs';
export { getTriggerNodesWithType } from './get_trigger_nodes_with_type';
export { correctYamlSyntax } from './correct_yaml_syntax';
export { affectsYamlMetadata, updateWorkflowYamlFields } from './update_workflow_yaml_fields';
export {
  buildWorkflowLookup,
  inspectStep,
  getValueFromValueNode,
  NESTED_STEP_KEYS,
  isNestedStepKey,
  type NestedStepKey,
  type StepInfo,
  type StepPropInfo,
  type WorkflowLookup,
} from '@kbn/workflows-yaml';
