export interface IpRangeQuery {
    validSearch: boolean;
    rangeQuery?: Array<{
        key: string;
        from: string;
        to: string;
    } | {
        key: string;
        mask: string;
    }>;
}
export type IpType = 'ipv4' | 'ipv6';
interface IpSegments {
    segments: string[];
    type: IpType | 'unknown';
}
export declare const getIsValidFullIp: (searchString: string) => boolean;
export declare const getIsCidrNotation: (searchString: string) => boolean;
/**
 * Validates a CIDR notation string and determines the IP type (IPv4 or IPv6).
 */
export declare const getValidCidrRange: (searchString: string) => {
    isValid: boolean;
    ipType?: IpType;
};
export declare const getIpSegments: (searchString: string) => IpSegments;
export declare const getMinMaxIp: (type: IpType, segments: IpSegments["segments"]) => {
    min: string;
    max: string;
};
export declare const getIpRangeQuery: (searchString: string) => IpRangeQuery;
export {};
