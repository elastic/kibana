interface AbsoluteURLFactoryOptions {
    basePath: string;
    protocol: string;
    hostname: string;
    port: string | number;
}
export declare const getAbsoluteUrlFactory: ({ protocol, hostname, port, basePath, }: AbsoluteURLFactoryOptions) => ({ hash, path, search }?: {
    hash?: string | undefined;
    path?: string | undefined;
    search?: string | undefined;
}) => string;
export {};
