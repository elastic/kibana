// This isn't ideal. We want to avoid searching for 20 indices
// then filtering out the majority of them because they are sysetm indices.
// We'd like to filter system indices out in the query
// so if we can accomplish that in the future, this logic can go away
export const ESTIMATED_NUMBER_OF_SYSTEM_INDICES = 100;
export const MAX_NUMBER_OF_MATCHING_INDICES = 100;
export const MAX_SEARCH_SIZE = MAX_NUMBER_OF_MATCHING_INDICES + ESTIMATED_NUMBER_OF_SYSTEM_INDICES;

export const PER_PAGE_INCREMENTS = [5, 10, 20, 50];
export const ILLEGAL_CHARACTERS = ['\\', '/', '?', '"', '<', '>', '|', ' '];
