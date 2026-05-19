import type { ICommandMethods } from '../registry';
import type { ICommandContext } from '../types';
import { Commands } from '../../definitions/keywords';
export declare const whereCommand: {
    name: Commands;
    methods: ICommandMethods<ICommandContext>;
    metadata: {
        subquerySupport: boolean;
        description: string;
        declaration: string;
        examples: string[];
    };
};
