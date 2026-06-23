import type { ICommandMethods } from '../registry';
import type { ICommandContext } from '../types';
import type { Commands } from '../../definitions/keywords';
export declare const uriPartsCommand: {
    name: Commands;
    methods: ICommandMethods<ICommandContext>;
    metadata: {
        preview: boolean;
        description: string;
        declaration: string;
        examples: string[];
    };
};
