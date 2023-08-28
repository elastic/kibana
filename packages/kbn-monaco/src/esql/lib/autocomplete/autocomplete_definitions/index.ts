/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RawSignatureDefinition } from '../types';
import { sourceCommandsRawDefinitions } from './source_commands';
import { processingRawCommandsDefinition } from './processing_commands';

export const signatures: RawSignatureDefinition[] = sourceCommandsRawDefinitions.concat(
  processingRawCommandsDefinition
);

export {
  aggregationFunctionsDefinitions,
  mathCommandDefinition,
  whereCommandDefinition,
} from './functions_commands';
export { sourceCommandsDefinitions } from './source_commands';
export { processingCommandsDefinitions, pipeDefinition } from './processing_commands';

export {
  comparisonCommandsDefinitions,
  comparisonOperatorsCommandsDefinitions,
} from './comparison_commands';
export {
  mathOperatorsCommandsDefinitions,
  assignOperatorDefinition,
  asOperatorDefinition,
  byOperatorDefinition,
  openBracketDefinition,
  closeBracketDefinition,
} from './operators_commands';

export {
  orderingCommandsDefinitions,
  nullsCommandsDefinition,
  nullsOrderingCommandsDefinitions,
} from './ordering_commands';

export {
  buildNewVarDefinition,
  buildSourcesDefinitions,
  buildFieldsDefinitions,
  buildConstantsDefinitions,
} from './dynamic_commands';
