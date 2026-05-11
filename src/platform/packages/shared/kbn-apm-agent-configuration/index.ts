/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Configuration types
export type { AgentConfigurationIntake, AgentConfiguration } from './src/configuration_types';

// Constants
export {
  AgentConfigurationPageStep,
  agentConfigurationPageStepRt,
} from './src/constants';

// All option
export {
  ALL_OPTION_VALUE,
  ALL_OPTION,
  getOptionLabel,
  omitAllOption,
} from './src/all_option';

// Amount and unit
export {
  type AmountAndUnit,
  amountAndUnitToObject,
  amountAndUnitToString,
} from './src/amount_and_unit';

// Runtime types
export { serviceRt, settingsRt, agentConfigurationIntakeRt } from './src/runtime_types/agent_configuration_intake_rt';
export { booleanRt } from './src/runtime_types/boolean_rt';
export { captureBodyRt } from './src/runtime_types/capture_body_rt';
export { logLevelRt } from './src/runtime_types/log_level_rt';
export { logEcsReformattingRt } from './src/runtime_types/log_ecs_reformatting_rt';
export { traceContinuationStrategyRt } from './src/runtime_types/trace_continuation_strategy_rt';
export { loggingLevelRt } from './src/runtime_types/logging_level_rt';
export { floatThreeDecimalPlacesRt } from './src/runtime_types/float_three_decimal_places_rt';
export { floatFourDecimalPlacesRt } from './src/runtime_types/float_four_decimal_places_rt';
export { getIntegerRt } from './src/runtime_types/integer_rt';
export { getDurationRt } from './src/runtime_types/duration_rt';
export { getBytesRt } from './src/runtime_types/bytes_rt';
export { getStorageSizeRt } from './src/runtime_types/storage_size_rt';
export { getRangeTypeMessage } from './src/runtime_types/get_range_type_message';

// Setting definitions
export {
  settingDefinitions,
  filterByAgent,
  validateSetting,
} from './src/setting_definitions';
export type {
  SettingValidation,
  RawSettingDefinition,
  SettingDefinition,
} from './src/setting_definitions/types';
