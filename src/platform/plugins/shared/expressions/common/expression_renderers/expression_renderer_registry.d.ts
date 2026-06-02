import type { IRegistry } from '../types';
import { ExpressionRenderer } from './expression_renderer';
import type { AnyExpressionRenderDefinition } from './types';
export declare class ExpressionRendererRegistry implements IRegistry<ExpressionRenderer> {
    private readonly renderers;
    register(definition: AnyExpressionRenderDefinition | (() => AnyExpressionRenderDefinition)): void;
    get(id: string): ExpressionRenderer | null;
    toJS(): Record<string, ExpressionRenderer>;
    toArray(): ExpressionRenderer[];
}
