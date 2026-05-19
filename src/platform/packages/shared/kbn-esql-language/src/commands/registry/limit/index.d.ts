import type { ICommandMethods } from '../registry';
import type { ICommandContext } from '../types';
import { Commands } from '../../definitions/keywords';
export declare const limitCommand: {
    name: Commands;
    methods: ICommandMethods<ICommandContext>;
    metadata: {
        description: string;
        preview: boolean;
        declaration: string;
        examples: string[];
    };
};
