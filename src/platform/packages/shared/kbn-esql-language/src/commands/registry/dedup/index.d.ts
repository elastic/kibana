import type { ICommandMethods } from '../registry';
import type { ICommandContext } from '../types';
import type { Commands } from '../../definitions/keywords';
export declare const dedupCommand: {
    name: Commands;
    methods: ICommandMethods<ICommandContext>;
    metadata: {
        description: string;
        declaration: string;
        examples: string[];
    };
};
