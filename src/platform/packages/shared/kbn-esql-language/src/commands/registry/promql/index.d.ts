import type { ICommandMethods } from '../registry';
import type { ICommandContext } from '../types';
export declare const promqlCommand: {
    name: string;
    methods: ICommandMethods<ICommandContext>;
    metadata: {
        type: "source";
        preview: boolean;
        description: string;
        declaration: string;
        examples: string[];
    };
};
