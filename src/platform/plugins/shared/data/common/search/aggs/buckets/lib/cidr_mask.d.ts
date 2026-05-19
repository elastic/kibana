export declare class CidrMask {
    private static getNetmask;
    private address;
    private netmask;
    private prefix;
    constructor(cidr: string);
    private getBroadcastAddress;
    private getNetworkAddress;
    getRange(): {
        from: string;
        to: string;
    };
    toString(): string;
}
