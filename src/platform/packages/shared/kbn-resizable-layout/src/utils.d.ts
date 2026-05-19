import { ResizableLayoutDirection } from '../types';
export declare const percentToPixels: (containerSize: number, percentage: number) => number;
export declare const pixelsToPercent: (containerSize: number, pixels: number) => number;
export declare const getContainerSize: (direction: ResizableLayoutDirection, width: number, height: number) => number;
