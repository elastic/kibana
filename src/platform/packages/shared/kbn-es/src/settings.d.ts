export declare enum SettingsFilter {
    All = "all",
    SecureOnly = "secure-only",
    NonSecureOnly = "non-secure-only"
}
/**
 * Accepts an array of `esSettingName=esSettingValue` strings and parses them into an array of
 * [esSettingName, esSettingValue] tuples optionally filter out secure or non-secure settings.
 * @param rawSettingNameValuePairs Array of strings to parse
 * @param [filter] Optional settings filter.
 */
export declare function parseSettings(rawSettingNameValuePairs: string[], { filter }?: {
    filter: SettingsFilter;
}): [string, string][];
