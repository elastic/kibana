import { transitions } from '../transitions';
import { transitionsRegistry } from './transitions_registry';

transitions.forEach(spec => transitionsRegistry.register(spec));
