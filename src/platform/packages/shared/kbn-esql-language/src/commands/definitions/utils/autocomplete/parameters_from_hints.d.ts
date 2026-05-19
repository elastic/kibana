import type { ESQLCallbacks } from '@kbn/esql-types';
import type { ParameterHint, ParameterHintEntityType } from '../../..';
import type { ICommandContext, ISuggestionItem } from '../../../registry/types';
type SuggestionResolver = (hint: ParameterHint, ctx?: ICommandContext) => ISuggestionItem[];
type ContextResolver = (hint: ParameterHint, ctx: Partial<ICommandContext>, callbacks: ESQLCallbacks) => Promise<Record<string, unknown>>;
/**
 * For some parameters, ES gives us hints about the nature of it, that we use to provide
 * custom autocompletion handlers.
 *
 * For each hint we need to provide:
 * - a suggestionResolver to generate the autocompletion items for this param.
 * - optionally, a contextResolver that populates the context with the data needed by the suggestionResolver.
 *
 * Important!
 * Be mindful while implementing context resolvers, context is shared by the command and all functions used within it.
 * If the data you need is already present, don't overwrite it, prefer merging it.
 */
export declare const parametersFromHintsResolvers: Partial<Record<ParameterHintEntityType, {
    suggestionResolver: SuggestionResolver;
    contextResolver?: ContextResolver;
}>>;
export {};
