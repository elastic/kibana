import type { PlacementStrategy } from '@kbn/embeddable-plugin/public';
export declare function getPlacementHints(embeddableType: string, serializedState?: object): Promise<{
    strategy: PlacementStrategy;
    height: number;
    width: number;
}>;
