export declare function createSamplerAgg({ type, probability, seed, }: {
    type?: string;
    probability: number;
    seed?: number;
}): {
    [type]: {
        probability: number;
        seed: number | undefined;
    };
    aggs: {};
};
export declare function isSamplingEnabled(probability: number | undefined): boolean;
