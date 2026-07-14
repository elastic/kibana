import type { TypeOptions } from './type';
import { Type } from './type';
export type IpVersion = 'ipv4' | 'ipv6';
export type IpOptions = TypeOptions<string> & {
    /**
     * IP versions to accept, defaults to ['ipv4', 'ipv6'].
     */
    versions: IpVersion[];
};
export declare class IpType extends Type<string> {
    constructor(options?: IpOptions);
    protected handleError(type: string, { value, version }: Record<string, any>): string | undefined;
}
