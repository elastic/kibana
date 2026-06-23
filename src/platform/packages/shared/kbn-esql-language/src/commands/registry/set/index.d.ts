import type { ICommandMethods } from '../registry';
import type { ICommandContext } from '../types';
export declare const setCommand: {
    name: string;
    methods: ICommandMethods<ICommandContext>;
    metadata: {
        type: "header";
        description: string;
        declaration: string;
        examples: string[];
        hidden: boolean;
        name: string;
    };
};
