import type { ICommandContext } from '../types';
import type { ICommandMethods } from '../registry';
export declare const inlineStatsCommand: {
    name: string;
    methods: ICommandMethods<ICommandContext>;
    metadata: {
        hidden: boolean;
        preview: boolean;
        description: string;
        declaration: string;
        examples: string[];
    };
};
