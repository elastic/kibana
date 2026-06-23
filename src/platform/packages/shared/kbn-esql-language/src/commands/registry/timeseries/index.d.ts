import type { ICommandMethods } from '../registry';
import type { ICommandContext } from '../types';
export declare const timeseriesCommand: {
    name: string;
    methods: ICommandMethods<ICommandContext>;
    metadata: {
        type: "source";
        subquerySource: boolean;
        subquerySourceHidden: boolean;
        hidden: boolean;
        preview: boolean;
        isTimeseries: boolean;
        description: string;
        declaration: string;
        examples: string[];
    };
};
