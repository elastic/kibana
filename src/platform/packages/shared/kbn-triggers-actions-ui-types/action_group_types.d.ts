import type { ActionGroup } from '@kbn/alerting-types';
export type OmitMessageVariablesType = 'all' | 'keepContext';
export interface ActionGroupWithMessageVariables extends ActionGroup<string> {
    omitMessageVariables?: OmitMessageVariablesType;
    defaultActionMessage?: string;
}
