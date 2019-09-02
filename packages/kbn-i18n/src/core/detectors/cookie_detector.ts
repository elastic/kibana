import { LOCALE_COOKIE } from '../i18n';

export function cookieDetector(req: any) {
  return req.server.states.cookies[LOCALE_COOKIE];
}
