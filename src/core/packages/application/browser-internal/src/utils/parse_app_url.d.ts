import type { IBasePath } from '@kbn/core-http-browser';
import type { App } from '@kbn/core-application-browser';
import type { ParsedAppUrl } from '../types';
/**
 * Parse given URL and return the associated app id and path if any app matches, or undefined if none do.
 * Input can either be:
 *
 * - an absolute path containing the basePath,
 *   e.g `/base-path/app/my-app/some-path`
 *
 * - an absolute URL matching the `origin` of the Kibana instance (as seen by the browser),
 *   e.g `https://kibana:8080/base-path/app/my-app/some-path`
 *
 * - a path relative to the provided `currentUrl`.
 *   e.g with `currentUrl` being `https://kibana:8080/base-path/app/current-app/some-path`
 *   `../other-app/other-path` will be converted to `/base-path/app/other-app/other-path`
 */
export declare const parseAppUrl: (url: string, basePath: IBasePath, apps: Map<string, App<unknown>>, currentUrl?: string) => ParsedAppUrl | undefined;
