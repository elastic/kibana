import type { ActionVariable } from '@kbn/alerting-types';
import type { ActionGroupWithMessageVariables, ActionVariables } from '@kbn/triggers-actions-ui-types';
export declare const getAvailableActionVariables: (actionVariables: ActionVariables, summaryActionVariables?: ActionVariables, actionGroup?: ActionGroupWithMessageVariables, isSummaryAction?: boolean) => ActionVariable[];
