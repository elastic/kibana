import type { ICommandMethods } from '../registry';
import type { ICommandContext } from '../types';
export declare const fuseCommand: {
    name: string;
    methods: ICommandMethods<ICommandContext>;
    metadata: {
        description: string;
        declaration: string;
        examples: string[];
        hidden: boolean;
        preview: boolean;
        name: string;
    };
};
