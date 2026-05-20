export declare function sha256Hash(message: string): Promise<string>;
export declare function hmacSha256(key: BufferSource, message: string): Promise<ArrayBuffer>;
export declare function calculateAWSA4Signature(secretAccessKey: string, dateStamp: string, region: string, service: string, stringToSign: string): Promise<string>;
