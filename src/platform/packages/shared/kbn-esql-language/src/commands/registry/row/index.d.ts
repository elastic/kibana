import type { ICommandMethods } from '../registry';
import type { ICommandContext } from '../types';
export declare const rowCommand: {
    name: string;
    methods: ICommandMethods<ICommandContext>;
    metadata: {
        type: "source";
        subquerySource: boolean;
        subquerySourceHidden: boolean;
        description: string;
        declaration: string;
        examples: string[];
    };
};
