import type { FileImageMetadata } from '@kbn/shared-ux-file-types';
export declare function isImage(file: {
    type?: string;
}): boolean;
export declare const boxDimensions: {
    width: number;
    height: number;
};
/**
 * Calculate the size of an image, fitting to our limits see {@link boxDimensions},
 * while preserving the aspect ratio.
 */
export declare function fitToBox(width: number, height: number): {
    width: number;
    height: number;
};
/**
 * Extract image metadata, assumes that file or blob as an image!
 */
export declare function getImageMetadata(file: File | Blob): Promise<undefined | FileImageMetadata>;
export type ImageMetadataFactory = typeof getImageMetadata;
export declare function getBlurhashSrc({ width, height, hash, }: {
    width: number;
    height: number;
    hash: string;
}): string;
