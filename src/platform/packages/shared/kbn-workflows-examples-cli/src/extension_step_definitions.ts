/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BaseConnectorContract } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';

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
import {
  AiClassifyStepCommonDefinition,
  AiPromptStepCommonDefinition,
  AiSummarizeStepCommonDefinition,
} from '@kbn/workflows-extensions/common/steps/ai';

// ai.agent and search.rerank — agent_builder plugin common
import {
  runAgentStepCommonDefinition,
  rerankStepCommonDefinition,
} from '@kbn/agent-builder-plugin/common/step_types';

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

// security.* steps are registered by the security_solution plugin (group: security, visibility: private).
// They cannot be imported from a platform package, so we use permissive z.any() placeholders
// sourced from the approved step definitions list.
const SECURITY_STEP_IDS = [
  'security.buildAlertEntityGraph',
  'security.renderAlertNarrative',
] as const;

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

let cache: BaseConnectorContract[] | undefined;

/**
 * Returns BaseConnectorContract entries for all extension step definitions
 * registered by platform plugins (data.*, ai.*, cases.*, search.rerank).
 *
 * Security-solution step types (security.*) are included as permissive z.any()
 * placeholders because that plugin is not accessible from a platform package.
 */
export const getExtensionStepContracts = (): BaseConnectorContract[] => {
  if (cache) return cache;

  const securityPlaceholders: BaseConnectorContract[] = SECURITY_STEP_IDS.map((id) => ({
    type: id,
    summary: id,
    description: null,
    paramsSchema: z.any(),
    outputSchema: z.any(),
  }));

  cache = [
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
    toContract(AiClassifyStepCommonDefinition),
    toContract(AiPromptStepCommonDefinition),
    toContract(AiSummarizeStepCommonDefinition),
    toContract(runAgentStepCommonDefinition),
    // search.*
    toContract(rerankStepCommonDefinition),
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
    // security.* (private plugin — permissive placeholders)
    ...securityPlaceholders,
  ];
  return cache;
};
