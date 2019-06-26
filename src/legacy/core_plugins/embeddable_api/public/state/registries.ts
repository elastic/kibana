import { Trigger } from '../triggers';

export type TriggerRegistry = Map<string, Trigger>;
export const triggerRegistry = new Map<string, Trigger>();
