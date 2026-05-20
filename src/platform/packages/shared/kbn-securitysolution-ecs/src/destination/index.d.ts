import type { GeoEcs } from '../geo';
export interface DestinationEcs {
    bytes?: number[];
    ip?: string[];
    port?: number[];
    domain?: string[];
    geo?: GeoEcs;
    packets?: number[];
}
