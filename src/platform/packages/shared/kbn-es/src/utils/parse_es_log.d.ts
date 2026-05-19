/**
 * extract useful info about an es log line
 */
export declare function parseEsLog(data: string): {
    formattedMessage: string;
    message: string;
    level: string;
}[];
