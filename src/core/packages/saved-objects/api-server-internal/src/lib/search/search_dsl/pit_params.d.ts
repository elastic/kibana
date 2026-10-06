import type { SavedObjectsPitParams } from '@kbn/core-saved-objects-api-server';
export declare function getPitParams(pit: SavedObjectsPitParams): {
    pit: {
        id: string;
        keep_alive?: string | undefined;
    };
};
