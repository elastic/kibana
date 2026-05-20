import type { PlacementStrategy } from '@kbn/embeddable-plugin/public';
import type { PanelPlacementProps, PanelPlacementReturn } from './types';
export declare const runPanelPlacementStrategy: (strategy: PlacementStrategy, { width, height, currentPanels, sectionId, beside }: PanelPlacementProps) => PanelPlacementReturn;
