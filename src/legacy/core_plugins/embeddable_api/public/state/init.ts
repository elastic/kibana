import { triggerRegistry } from './registries';
import { CONTEXT_MENU_TRIGGER, APPLY_FILTER_TRIGGER } from '../triggers';

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
