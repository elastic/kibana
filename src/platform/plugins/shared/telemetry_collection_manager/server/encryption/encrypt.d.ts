export declare function getKID(useProdKey?: boolean): string;
export declare function encryptTelemetry<Payload = unknown>(payload: Payload, { useProdKey }?: {
    useProdKey?: boolean | undefined;
}): Promise<string>;
