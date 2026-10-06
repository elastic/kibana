import type { Request } from '@hapi/hapi';
export declare function getRequestId(request: Request, { allowFromAnyIp, ipAllowlist }: {
    allowFromAnyIp: boolean;
    ipAllowlist: string[];
}): string;
