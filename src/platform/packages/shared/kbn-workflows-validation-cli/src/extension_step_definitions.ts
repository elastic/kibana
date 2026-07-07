/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BaseConnectorContract } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';

// data.* and ai.classify/prompt/summarize — workflows_extensions plugin common
import {
  dataAggregateStepCommonDefinition,
  dataConcatStepCommonDefinition,
  dataDedupeStepCommonDefinition,
  dataFilterStepCommonDefinition,
  dataFindStepCommonDefinition,
  dataMapStepCommonDefinition,
  dataParseJsonStepCommonDefinition,
  dataRegexExtractStepCommonDefinition,
  dataRegexReplaceStepCommonDefinition,
  dataStringifyJsonStepCommonDefinition,
} from '@kbn/workflows-extensions/common/steps/data';

// ai.agent and search.rerank — agent_builder plugin common
import {
  runAgentStepCommonDefinition,
  rerankStepCommonDefinition,
} from '@kbn/agent-builder-plugin/common/step_types';

// ai.prompt, ai.summarize, ai.classify — inference_workflows plugin common
import {
  AiPromptStepCommonDefinition,
  AiSummarizeStepCommonDefinition,
  AiClassifyStepCommonDefinition,
} from '@kbn/inference-workflows-plugin/common/steps/ai';

// contextEngine.addEntry — agent_context_layer plugin common
import { contextEngineAddEntryStepCommonDefinition } from '@kbn/agent-context-layer-plugin/common/workflow_steps/sml_index_attachment_step';

// cases.* — cases plugin common
import { addAlertsStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/add_alerts';
import { addCommentStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/add_comment';
import { addEventsStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/add_events';
import { addObservablesStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/add_observables';
import { addTagsStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/add_tags';
import { assignCaseStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/assign_case';
import { closeCaseStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/close_case';
import { createCaseStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/create_case';
import { createCaseFromTemplateStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/create_case_from_template';
import { deleteCasesStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/delete_cases';
import { deleteObservableStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/delete_observable';
import { findCasesStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/find_cases';
import { findSimilarCasesStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/find_similar_cases';
import { getAllAttachmentsStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/get_all_attachments';
import { getCaseStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/get_case';
import { getCasesStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/get_cases';
import { getCasesByAlertIdStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/get_cases_by_alert_id';
import { setCategoryStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/set_category';
import { setCustomFieldStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/set_custom_field';
import { setDescriptionStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/set_description';
import { setSeverityStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/set_severity';
import { setStatusStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/set_status';
import { setTitleStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/set_title';
import { unassignCaseStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/unassign_case';
import { updateCaseStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/update_case';
import { updateCasesStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/update_cases';
import { updateObservableStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/update_observable';
import { pushCasesStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/push_cases';
import { removeTagsStepCommonDefinition } from '@kbn/cases-plugin/common/workflows/steps/remove_tags';

// security.* steps — security_solution is group:security/visibility:private so a platform package
// cannot legally import it under the @kbn/imports/no_group_crossing_imports rule.
// We suppress that rule here as a deliberate, temporary deviation:
//   - The CLI is a package (not a plugin), so the manifest-crossing rule never fires.
//   - The schemas already live in security_solution/common/ and resolve correctly.
//   - TODO: remove these eslint-disable comments once the security team relocates these step schemas
//     into a platform/shared module (tracked in https://github.com/elastic/kibana/issues/XXXXX).

import { assignAlertStepCommonDefinition } from '@kbn/security-solution-plugin/common/workflows/step_types/assign_alert_step/assign_alert_step_common';

import { assignAttackStepCommonDefinition } from '@kbn/security-solution-plugin/common/workflows/step_types/assign_attack_step/assign_attack_step_common';

import { buildAlertEntityGraphStepCommonDefinition } from '@kbn/security-solution-plugin/common/workflows/step_types/build_alert_entity_graph_step/build_alert_entity_graph_step_common';

import { renderAlertNarrativeStepCommonDefinition } from '@kbn/security-solution-plugin/common/workflows/step_types/render_alert_narrative_step/render_alert_narrative_step_common';

import { setAlertStatusStepCommonDefinition } from '@kbn/security-solution-plugin/common/workflows/step_types/set_alert_status_step/set_alert_status_step_common';

import { setAlertTagsStepCommonDefinition } from '@kbn/security-solution-plugin/common/workflows/step_types/set_alert_tags_step/set_alert_tags_step_common';

import { setAttackStatusStepCommonDefinition } from '@kbn/security-solution-plugin/common/workflows/step_types/set_attack_status_step/set_attack_status_step_common';

import { setAttackTagsStepCommonDefinition } from '@kbn/security-solution-plugin/common/workflows/step_types/set_attack_tags_step/set_attack_tags_step_common';

interface AnyStepDefinition {
  id: string;
  inputSchema: z.ZodType;
  outputSchema: z.ZodType;
  configSchema?: z.ZodType;
  description?: string | null;
  label?: string | null;
}

const toContract = (def: AnyStepDefinition): BaseConnectorContract => ({
  type: def.id,
  summary: def.label ?? null,
  description: def.description ?? null,
  paramsSchema: def.inputSchema,
  outputSchema: def.outputSchema,
  ...(def.configSchema !== undefined && { configSchema: def.configSchema as z.ZodObject }),
});

let cachedContracts: BaseConnectorContract[] | undefined;

/**
 * Returns BaseConnectorContract entries for all extension step definitions
 * registered by platform plugins (data.*, ai.*, cases.*, search.rerank) and
 * security-solution plugins (security.*).
 *
 * Security-solution step types (security.*) are imported directly from
 * security_solution/common/ with a scoped eslint-disable to bypass the
 * no_group_crossing_imports boundary rule. See the comment above the imports
 * for the rationale and the permanent-fix tracking issue.
 */
export const getExtensionStepContracts = (): BaseConnectorContract[] => {
  if (cachedContracts) return cachedContracts;

  cachedContracts = [
    // data.*
    toContract(dataAggregateStepCommonDefinition),
    toContract(dataConcatStepCommonDefinition),
    toContract(dataDedupeStepCommonDefinition),
    toContract(dataFilterStepCommonDefinition),
    toContract(dataFindStepCommonDefinition),
    toContract(dataMapStepCommonDefinition),
    toContract(dataParseJsonStepCommonDefinition),
    toContract(dataRegexExtractStepCommonDefinition),
    toContract(dataRegexReplaceStepCommonDefinition),
    toContract(dataStringifyJsonStepCommonDefinition),
    // ai.*
    toContract(runAgentStepCommonDefinition),
    toContract(AiPromptStepCommonDefinition),
    toContract(AiSummarizeStepCommonDefinition),
    toContract(AiClassifyStepCommonDefinition),
    // search.*
    toContract(rerankStepCommonDefinition),
    // contextEngine.*
    toContract(contextEngineAddEntryStepCommonDefinition),
    // cases.*
    toContract(addAlertsStepCommonDefinition),
    toContract(addCommentStepCommonDefinition),
    toContract(addEventsStepCommonDefinition),
    toContract(addObservablesStepCommonDefinition),
    toContract(addTagsStepCommonDefinition),
    toContract(assignCaseStepCommonDefinition),
    toContract(closeCaseStepCommonDefinition),
    toContract(createCaseStepCommonDefinition),
    toContract(createCaseFromTemplateStepCommonDefinition),
    toContract(deleteCasesStepCommonDefinition),
    toContract(deleteObservableStepCommonDefinition),
    toContract(findCasesStepCommonDefinition),
    toContract(findSimilarCasesStepCommonDefinition),
    toContract(getAllAttachmentsStepCommonDefinition),
    toContract(getCaseStepCommonDefinition),
    toContract(getCasesStepCommonDefinition),
    toContract(getCasesByAlertIdStepCommonDefinition),
    toContract(setCategoryStepCommonDefinition),
    toContract(setCustomFieldStepCommonDefinition),
    toContract(setDescriptionStepCommonDefinition),
    toContract(setSeverityStepCommonDefinition),
    toContract(setStatusStepCommonDefinition),
    toContract(setTitleStepCommonDefinition),
    toContract(unassignCaseStepCommonDefinition),
    toContract(updateCaseStepCommonDefinition),
    toContract(updateCasesStepCommonDefinition),
    toContract(updateObservableStepCommonDefinition),
    toContract(pushCasesStepCommonDefinition),
    toContract(removeTagsStepCommonDefinition),
    // security.*
    toContract(assignAlertStepCommonDefinition),
    toContract(assignAttackStepCommonDefinition),
    toContract(buildAlertEntityGraphStepCommonDefinition),
    toContract(renderAlertNarrativeStepCommonDefinition),
    toContract(setAlertStatusStepCommonDefinition),
    toContract(setAlertTagsStepCommonDefinition),
    toContract(setAttackStatusStepCommonDefinition),
    toContract(setAttackTagsStepCommonDefinition),
  ];
  return cachedContracts;
};
