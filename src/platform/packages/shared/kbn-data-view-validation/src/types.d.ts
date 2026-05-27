import type { ILLEGAL_CHARACTERS_KEY, CONTAINS_SPACES_KEY } from './constants';
export interface ValidationErrors {
    [ILLEGAL_CHARACTERS_KEY]?: string[];
    [CONTAINS_SPACES_KEY]?: boolean;
}
