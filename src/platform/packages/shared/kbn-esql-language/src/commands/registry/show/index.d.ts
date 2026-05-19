import type { ICommandMethods } from '../registry';
import type { ICommandContext } from '../types';
export declare const showCommand: {
    name: string;
    methods: ICommandMethods<ICommandContext>;
    metadata: {
        type: "source";
        description: string;
        declaration: string;
        examples: string[];
    };
};
