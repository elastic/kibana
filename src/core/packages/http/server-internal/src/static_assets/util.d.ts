export declare function removeSurroundingSlashes(pathname: string): string;
export declare function suffixPathnameToURLPathname(urlString: string, pathname: string): string;
/**
 * Appends a value to pathname. Pathname is assumed to come from URL.pathname
 * Also do some quality control on the path to ensure that it matches URL.pathname.
 */
export declare function suffixPathnameToPathname(pathnameA: string, pathnameB: string): string;
