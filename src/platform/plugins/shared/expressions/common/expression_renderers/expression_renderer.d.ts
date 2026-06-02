import type { ExpressionRenderDefinition } from './types';
export declare class ExpressionRenderer<Config = unknown> {
    readonly name: string;
    readonly namespace?: string;
    readonly displayName: string;
    readonly help: string;
    readonly validate: () => void | Error;
    readonly reuseDomNode: boolean;
    readonly render: ExpressionRenderDefinition<Config>['render'];
    constructor(config: ExpressionRenderDefinition<Config>);
}
