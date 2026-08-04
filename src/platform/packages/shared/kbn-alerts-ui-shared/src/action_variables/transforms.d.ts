import type { ActionVariable } from '@kbn/alerting-types';
import type { ActionVariables, OmitMessageVariablesType } from '@kbn/triggers-actions-ui-types';
export declare const getSummaryAlertActionVariables: () => ActionVariable[];
export declare const getAlwaysProvidedActionVariables: () => ActionVariable[];
export declare const transformActionVariables: (actionVariables: ActionVariables, summaryActionVariables?: ActionVariables, omitMessageVariables?: OmitMessageVariablesType, isSummaryAction?: boolean) => ActionVariable[];
