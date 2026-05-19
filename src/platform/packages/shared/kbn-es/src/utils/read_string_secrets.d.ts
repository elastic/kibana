/**
 * Reads the string_secrets map from a serverless secrets JSON file.
 * Returns the key-value pairs that ES expects under state.cluster_secrets.
 */
export declare function readStringSecrets(secretsFilePath: string): Promise<Record<string, string>>;
