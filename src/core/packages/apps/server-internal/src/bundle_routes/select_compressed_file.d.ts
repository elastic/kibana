declare module '@hapi/accept' {
    function encodings(encodingHeader?: string, preferences?: string[]): string[];
}
export declare function selectCompressedFile(acceptEncodingHeader: string | undefined, path: string): Promise<{
    fd: number;
    fileEncoding: "gzip" | "br" | undefined;
}>;
