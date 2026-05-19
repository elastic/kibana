/**
 * Parse an AWS hostname into service and region.
 * Supports: {service}.{region}.amazonaws.com
 */
export declare function parseAwsHost(hostname: string): {
    service: string;
    region: string;
    itemName?: string;
} | null;
/**
 * Sign an AWS request with SigV4.
 * Automatically collects x-amz-* headers for signing (AWS requires them signed).
 */
export declare function signRequest(method: string, host: string, path: string, queryParams: Record<string, string>, accessKeyId: string, secretAccessKey: string, region: string, service: string, existingHeaders: Record<string, string>, body?: string): Promise<Record<string, string>>;
