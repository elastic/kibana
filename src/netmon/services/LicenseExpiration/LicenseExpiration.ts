import moment from 'moment';
const SHOW_IF_LESS_THAN_THIS = 30; // yellow banner if less than 30 days remain
const WARN_IF_LESS_THAN_THIS = 7; // red banner if yes than 7 days remain

class LicenseExpiration {
  construct() {}

  public shouldShowBanner(json: any): boolean {
    return !!(
      json.isLicensed &&
      json.expireTime &&
      json.expireDurationInDays &&
      json.expireDurationInDays < SHOW_IF_LESS_THAN_THIS
    );
  }

  public bannerContent(json: any): any {
    const title =
      json.expireDurationInDays < WARN_IF_LESS_THAN_THIS
        ? 'License Expiration Warning'
        : 'License Expiration Notice';
    const severity =
      json.expireDurationInDays < WARN_IF_LESS_THAN_THIS ? 'alert-danger' : 'alert-warning';
    const expireDate = this.getDateFromExpireTime(json.expireTime);

    let content: string = '';
    json.expireDurationInDays = Math.floor(json.expireDurationInDays);

    if (json.expireDurationInDays >= 1) {
      content = `Your license will expire in ${
        json.expireDurationInDays
      } day(s) on ${expireDate}. `;
    } else if (json.expireDurationInDays === 0) {
      content = `Your license expires in less than a day, on ${expireDate}. `;
    } else {
      content = 'Your license has expired. ';
    }
    content += 'Please contact crm@logrhythm.com to purchase a license.';

    return { title, severity, content };
  }

  public getDateFromExpireTime(expireTimeinMs: number): string | undefined {
    return expireTimeinMs !== undefined
      ? moment
          .utc(expireTimeinMs)
          .local()
          .format('MMMM Do YYYY, h:mm:ss a')
      : undefined;
  }
}

export default new LicenseExpiration();
