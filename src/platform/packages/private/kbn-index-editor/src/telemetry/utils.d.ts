type BucketConfig = Array<{
    to: number;
    label: string;
}>;
/**
 * Returns a bucket label for a given value based on a bucket configuration.
 * @param value The value to bucket.
 * @param config The bucket configuration. The last item in the config is used for values greater than the specified `to`.
 */
export declare const getBucket: (value: number, config: BucketConfig) => string;
export {};
