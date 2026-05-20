interface OsSummary {
    disableSandbox: boolean;
    os: {
        os: string;
        dist?: string;
        release?: string;
    };
}
export declare function getDefaultChromiumSandboxDisabled(): Promise<OsSummary>;
export {};
