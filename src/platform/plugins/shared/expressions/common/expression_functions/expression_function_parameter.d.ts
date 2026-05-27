import type { ArgumentType } from './arguments';
export declare class ExpressionFunctionParameter<T = unknown> {
    name: string;
    required: boolean;
    help: string;
    types: ArgumentType<T>['types'];
    default?: ArgumentType<T>['default'];
    aliases: string[];
    deprecated: boolean;
    multi: boolean;
    resolve: boolean;
    /**
     * @deprecated
     */
    strict?: boolean;
    options: T[];
    constructor(name: string, arg: ArgumentType<T>);
    accepts(type: string): boolean;
}
