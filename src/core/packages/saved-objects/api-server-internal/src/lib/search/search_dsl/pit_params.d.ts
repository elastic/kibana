import type { SavedObjectsPitParams } from '@kbn/core-saved-objects-api-server';
export declare function getPitParams(pit: SavedObjectsPitParams): {
    pit: {
        keep_alive?: string | undefined;
        id: string;
    };
};
