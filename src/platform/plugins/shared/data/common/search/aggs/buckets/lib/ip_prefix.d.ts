export interface IpPrefixAggKey {
    type: 'ip_prefix';
    address: string;
    prefix_length: number;
}
export type IpPrefixKey = IpPrefixAggKey;
export declare const convertIPPrefixToString: (cidr: IpPrefixKey, format: (val: any) => string) => string;
