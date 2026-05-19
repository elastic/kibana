import type { ICommandMethods } from '../registry';
import type { ICommandContext } from '../types';
import { Commands } from '../../definitions/keywords';
export declare const sampleCommand: {
    name: Commands;
    methods: ICommandMethods<ICommandContext>;
    metadata: {
        preview: boolean;
        description: string;
        declaration: string;
        examples: string[];
    };
};
