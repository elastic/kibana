/**
 * Narrows a catch block's value to the shape accepted by `Logger.error` /
 * `Logger.warn`: an `Error` instance (auto-serialized to ECS by the platform)
 * or a plain string. Non-Error / non-string values are JSON-serialized so
 * operators retain at least the shape of the failure (e.g. `{ code: 401 }`
 * instead of `'[object Object]'`); cyclic refs or values JSON cannot encode
 * (e.g. `BigInt`, `undefined`) fall back to `String(value)`.
 */
export declare const toLoggable: (value: unknown) => Error | string;
