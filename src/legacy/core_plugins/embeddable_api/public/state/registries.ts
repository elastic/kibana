import { Trigger, CONTEXT_MENU_TRIGGER, APPLY_FILTER_TRIGGER } from '../triggers';

export type TriggerRegistry = Map<string, Trigger>;
export const triggerRegistry = new Map<string, Trigger>();

triggerRegistry.set(CONTEXT_MENU_TRIGGER, {
  id: CONTEXT_MENU_TRIGGER,
  title: 'Context menu',
  actionIds: [],
});

triggerRegistry.set(APPLY_FILTER_TRIGGER, {
  id: APPLY_FILTER_TRIGGER,
  title: 'Filter click',
  actionIds: [],
});
