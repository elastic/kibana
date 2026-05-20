export type ChannelName = 'snapshot' | 'optInStatus';
export type TelemetryEnv = 'staging' | 'prod';
export interface GetTelemetryChannelEndpointConfig {
    channelName: ChannelName;
    env: TelemetryEnv;
    appendServerlessChannelsSuffix: boolean;
}
export declare function getChannel(channelName: ChannelName, appendServerlessChannelsSuffix: boolean): string;
export declare function getBaseUrl(env: TelemetryEnv): string;
export declare function getTelemetryChannelEndpoint({ channelName, env, appendServerlessChannelsSuffix, }: GetTelemetryChannelEndpointConfig): string;
