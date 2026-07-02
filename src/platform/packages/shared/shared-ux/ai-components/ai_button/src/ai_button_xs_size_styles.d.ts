import { type SerializedStyles } from '@emotion/react';
/**
 * EUI's `EuiButton` only supports `s`/`m` (no plan to add `xs`).
 * We define `xs` sizing locally so `AiButton` can visually match `EuiButtonEmpty` `size="xs"`.
 * These values mirror the current EUI tokens for `EuiButtonEmpty` size `xs`.
 */
export declare const useAiButtonXsSizeCss: () => SerializedStyles;
