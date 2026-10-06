import type { ICommandMethods } from '../registry';
import type { ICommandContext } from '../types';
export declare const completionCommand: {
    name: string;
    methods: ICommandMethods<ICommandContext>;
    metadata: {
        preview: boolean;
        description: string;
        declaration: string;
        examples: string[];
    };
};
