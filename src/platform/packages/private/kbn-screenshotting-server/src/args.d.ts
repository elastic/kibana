import type { ConfigType } from './config';
interface WindowSize {
    height: number;
    width: number;
}
type Proxy = ConfigType['browser']['chromium']['proxy'];
interface LaunchArgs {
    userDataDir: string;
    windowSize?: WindowSize;
    disableSandbox?: boolean;
    proxy: Proxy;
}
export declare const args: ({ userDataDir, disableSandbox, windowSize, proxy: proxyConfig, }: LaunchArgs) => string[];
export {};
