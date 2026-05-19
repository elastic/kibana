import type { IBasePath } from '@kbn/core-http-browser';
import { type PublicAppInfo, type PublicAppDeepLinkInfo } from '@kbn/core-application-browser';
import { NavLinkWrapper } from './nav_link';
export declare function toNavLink(app: PublicAppInfo, basePath: IBasePath, deepLink?: PublicAppDeepLinkInfo): NavLinkWrapper | null;
/**
 * @param {string} url - a relative or root relative url.  If a relative path is given then the
 * absolute url returned will depend on the current page where this function is called from. For example
 * if you are on page "http://www.mysite.com/shopping/kids" and you pass this function "adults", you would get
 * back "http://www.mysite.com/shopping/adults".  If you passed this function a root relative path, or one that
 * starts with a "/", for example "/account/cart", you would get back "http://www.mysite.com/account/cart".
 * @return {string} the relative url transformed into an absolute url
 */
export declare function relativeToAbsolute(url: string): string;
