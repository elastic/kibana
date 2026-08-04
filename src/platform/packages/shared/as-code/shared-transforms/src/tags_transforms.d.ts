import type { Reference } from '@kbn/content-management-utils';
export declare function toAsCodeTags(references?: Reference[]): {
    tags: string[];
};
export declare function toStoredTags<State extends {
    tags?: string[];
} = {
    tags?: string[];
}>(state: State): {
    state: Omit<State, 'tags'>;
    references: Reference[];
};
