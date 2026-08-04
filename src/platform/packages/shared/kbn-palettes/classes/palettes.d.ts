import type { IKbnPalette } from './types';
export declare class KbnPalettes {
    #private;
    constructor(palettes: IKbnPalette[], defaultPalette: IKbnPalette);
    query: (id: string) => IKbnPalette | undefined;
    get: (id: string) => IKbnPalette;
    getAll: () => IKbnPalette[];
}
