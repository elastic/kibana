import type { Commands } from '../../definitions/keywords';
import type { ICommandMethods } from '../registry';
import type { ICommandContext } from '../types';
export declare const userAgentCommand: {
    name: Commands;
    methods: ICommandMethods<ICommandContext>;
    metadata: {
        preview: boolean;
        description: string;
        declaration: string;
        examples: string[];
    };
};
