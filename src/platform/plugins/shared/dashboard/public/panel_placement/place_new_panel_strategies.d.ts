import { PlacementStrategy } from '@kbn/embeddable-plugin/public';
import type { PanelPlacementProps, PanelPlacementReturn } from './types';
export declare const runPanelPlacementStrategy: (strategy: PlacementStrategy, { newPanel, currentLayout, beside }: PanelPlacementProps) => PanelPlacementReturn;
