export interface CidrMaskIpRangeAggKey {
    type: 'mask';
    mask: string;
}
export interface RangeIpRangeAggKey {
    type: 'range';
    from: string;
    to: string;
}
export type IpRangeKey = CidrMaskIpRangeAggKey | RangeIpRangeAggKey;
export declare const convertIPRangeToString: (range: IpRangeKey, format: (val: any) => string) => string;
