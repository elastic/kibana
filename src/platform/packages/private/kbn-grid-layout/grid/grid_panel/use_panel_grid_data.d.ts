import type { BehaviorSubject } from 'rxjs';
import type { GridPanelData } from './types';
export declare const useGridPanelState: ({ panelId, }: {
    panelId: string;
}) => BehaviorSubject<(GridPanelData & {
    sectionId: string;
}) | undefined>;
