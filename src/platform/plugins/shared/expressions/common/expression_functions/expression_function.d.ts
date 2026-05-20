import type { SavedObjectReference } from '@kbn/core/types';
import type { MigrateFunctionsObject, GetMigrationFunctionObjectFn, PersistableState } from '@kbn/kibana-utils-plugin/common';
import type { AnyExpressionFunctionDefinition } from './types';
import type { ExpressionFunctionParameter } from './expression_function_parameter';
import type { ExpressionValue } from '../expression_types/types';
import type { ExpressionAstFunction } from '../ast';
export declare class ExpressionFunction implements PersistableState<ExpressionAstFunction['arguments']> {
    /**
     * Name of function
     */
    name: string;
    namespace?: string;
    /**
     * Aliases that can be used instead of `name`.
     */
    aliases: string[];
    /**
     * Return type of function. This SHOULD be supplied. We use it for UI
     * and autocomplete hinting. We may also use it for optimizations in
     * the future.
     */
    type: string;
    /**
     * Opt-in to caching this function. By default function outputs are cached and given the same inputs cached result is returned.
     */
    allowCache: boolean | {
        withSideEffects: (params: Record<string, unknown>, handlers: object) => () => void;
    };
    /**
     * Function to run function (context, args)
     */
    fn: (input: ExpressionValue, params: Record<string, unknown>, handlers: object) => ExpressionValue;
    /**
     * A short help text.
     */
    help: string;
    /**
     * Specification of expression function parameters.
     */
    args: Record<string, ExpressionFunctionParameter>;
    /**
     * Type of inputs that this function supports.
     */
    inputTypes: string[] | undefined;
    disabled: boolean;
    /**
     * Deprecation flag.
     */
    deprecated: boolean;
    telemetry: (state: ExpressionAstFunction['arguments'], telemetryData: Record<string, unknown>) => Record<string, unknown>;
    extract: (state: ExpressionAstFunction['arguments']) => {
        state: ExpressionAstFunction['arguments'];
        references: SavedObjectReference[];
    };
    inject: (state: ExpressionAstFunction['arguments'], references: SavedObjectReference[]) => ExpressionAstFunction['arguments'];
    migrations: MigrateFunctionsObject | GetMigrationFunctionObjectFn;
    constructor(functionDefinition: AnyExpressionFunctionDefinition);
    accepts: (type: string) => boolean;
}
