/**
 * Converts a relative path to an absolute url.
 * Implementation is based on a specified behavior of the browser to automatically convert
 * a relative url to an absolute one when setting the `href` attribute of a `<a>` html element.
 *
 * @example
 * ```ts
 * // current url: `https://kibana:8000/base-path/app/my-app`
 * relativeToAbsolute('/base-path/app/another-app') => `https://kibana:8000/base-path/app/another-app`
 * ```
 */
export declare const relativeToAbsolute: (url: string) => string;
