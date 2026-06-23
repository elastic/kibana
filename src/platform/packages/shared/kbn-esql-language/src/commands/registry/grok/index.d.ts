import type { ICommandMethods } from '../registry';
import type { ICommandContext } from '../types';
import { Commands } from '../../definitions/keywords';
export declare const grokCommand: {
    name: Commands;
    methods: ICommandMethods<ICommandContext>;
    metadata: {
        description: string;
        declaration: string;
        examples: string[];
    };
};
