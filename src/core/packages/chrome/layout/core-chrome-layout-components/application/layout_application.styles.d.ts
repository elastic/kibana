import type { ChromeStyle } from '../layout.types';
import type { EmotionFn } from '../types';
export declare const styles: {
    root: (chromeStyle?: ChromeStyle) => EmotionFn;
    content: EmotionFn;
    topBar: EmotionFn;
    bottomBar: EmotionFn;
};
