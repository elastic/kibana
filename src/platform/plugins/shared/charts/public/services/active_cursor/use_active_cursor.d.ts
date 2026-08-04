import type { RefObject } from 'react';
import type { Chart, PointerUpdateListener } from '@elastic/charts';
import type { ActiveCursor } from './active_cursor';
import type { ActiveCursorSyncOption } from './types';
export declare const useActiveCursor: (activeCursor: ActiveCursor, chartRef: RefObject<Chart>, syncOptions: ActiveCursorSyncOption) => PointerUpdateListener;
