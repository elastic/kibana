import type { GridPanelData } from '../grid_panel';
import type { GridLayoutData, OrderedLayout } from '../types';
export declare const isGridDataEqual: (a?: GridPanelData, b?: GridPanelData) => boolean;
export declare const isOrderedSectionEqual: (a?: OrderedLayout[string], b?: OrderedLayout[string]) => boolean;
export declare const isOrderedLayoutEqual: (a: OrderedLayout, b: OrderedLayout) => boolean;
export declare const isLayoutEqual: (a: GridLayoutData, b: GridLayoutData) => boolean;
