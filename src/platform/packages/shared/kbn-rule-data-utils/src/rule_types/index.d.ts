import type { AlertConsumers } from '../alerts_as_data_rbac';
import type { STACK_ALERTS_FEATURE_ID } from './stack_rules';
export * from './stack_rules';
export * from './o11y_rules';
export type RuleCreationValidConsumer = typeof AlertConsumers.LOGS | typeof AlertConsumers.INFRASTRUCTURE | typeof AlertConsumers.OBSERVABILITY | typeof STACK_ALERTS_FEATURE_ID | 'alerts';
