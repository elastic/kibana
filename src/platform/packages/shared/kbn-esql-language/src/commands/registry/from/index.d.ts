import type { ICommandMethods } from '../registry';
import type { ICommandContext } from '../types';
export declare const fromCommand: {
    name: string;
    methods: ICommandMethods<ICommandContext>;
    metadata: {
        type: "source";
        subquerySource: boolean;
        description: string;
        declaration: string;
        examples: string[];
    };
};
