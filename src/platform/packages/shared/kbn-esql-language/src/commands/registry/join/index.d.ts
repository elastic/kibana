import type { ICommandMethods } from '../registry';
import type { ICommandContext } from '../types';
export declare const joinCommand: {
    name: string;
    methods: ICommandMethods<ICommandContext>;
    metadata: {
        types: {
            name: string;
            description: string;
        }[];
        description: string;
        declaration: string;
        examples: string[];
    };
};
