/**
 * A Kibana HTTP API version
 *
 * @note
 * For public APIs: conforms to the Elastic API version specification APIs as a date string formatted as YYYY-MM-DD.
 * Ex. 2021-01-01 -> 2022-02-02
 *
 * @note
 * For internal APIs: follow the convention of monotonic increasing integers.
 * Ex. 1 -> 2 -> 3
 *
 * @experimental
 */
export type ApiVersion = string;
