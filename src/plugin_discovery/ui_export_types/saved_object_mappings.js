import { concat } from './reduce';
import { wrap, debug } from './modify_reduce';

// mapping types
export const mappings = wrap(debug, concat);
