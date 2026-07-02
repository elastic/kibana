import { type ScrollContainer } from '@kbn/core-chrome-layout-utils';
import type { UserMouseEvent } from './mouse';
export declare const stopAutoScroll: () => void;
export declare const startAutoScroll: (container: ScrollContainer) => void;
export declare const handleAutoscroll: (e: UserMouseEvent) => void;
