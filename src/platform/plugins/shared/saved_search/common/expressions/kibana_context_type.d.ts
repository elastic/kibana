import type { ExpressionValueFilter } from '@kbn/expressions-plugin/common';
import type { KibanaContext } from '@kbn/data-plugin/common';
export declare const kibanaContext: {
    name: string;
    from: {
        null: () => {
            type: string;
        };
    };
    to: {
        null: () => {
            type: string;
        };
        filter: (input: KibanaContext) => ExpressionValueFilter;
    };
};
