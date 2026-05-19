import type { VisParams } from '@kbn/visualizations-common';
import type { VisTypeAlias } from './vis_type_alias_registry';
import { BaseVisType } from './base_vis_type';
import type { VisTypeDefinition } from './types';
import type { VisGroups } from './vis_groups_enum';
/**
 * Vis Types Service
 *
 * @internal
 */
export declare class TypesService {
    private types;
    private registerVisualization;
    setup(): {
        /**
         * registers a visualization type
         * @param config - visualization type definition
         */
        createBaseVisualization: <TVisParams extends VisParams>(config: VisTypeDefinition<TVisParams>) => void;
        /**
         * registers a visualization alias
         * alias is a visualization type without implementation, it just redirects somewhere in kibana
         * @param {VisTypeAlias} config - visualization alias definition
         */
        registerAlias: (newVisTypeAlias: VisTypeAlias) => void;
    };
    start(): {
        /**
         * returns specific visualization or undefined if not found
         * @param {string} visualization - id of visualization to return
         */
        get: <TVisParams extends VisParams>(visualization: string) => BaseVisType<TVisParams> | undefined;
        /**
         * returns all registered visualization types
         */
        all: () => BaseVisType[];
        /**
         * returns all registered aliases
         */
        getAliases: () => VisTypeAlias[];
        /**
         * unregisters a visualization alias by its name
         * alias is a visualization type without implementation, it just redirects somewhere in kibana
         * @param {string} visTypeAliasName - visualization alias name
         */
        unRegisterAlias: (visTypeAliasName: string) => void;
        /**
         * returns all visualizations of specific group
         * @param {VisGroups} group - group type (aggbased | other | tools)
         */
        getByGroup: (group: VisGroups) => BaseVisType<any>[];
    };
    stop(): void;
}
/** @internal */
export type TypesSetup = ReturnType<TypesService['setup']>;
export type TypesStart = ReturnType<TypesService['start']>;
/** @public types */
export type { VisTypeAlias };
