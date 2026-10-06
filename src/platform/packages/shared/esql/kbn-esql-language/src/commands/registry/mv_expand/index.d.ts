import type { ICommandMethods } from '../registry';
import type { ICommandContext } from '../types';
export declare const mvExpandCommand: {
    name: string;
    methods: ICommandMethods<ICommandContext>;
    metadata: {
        description: string;
        declaration: string;
        examples: string[];
        preview: boolean;
    };
};
