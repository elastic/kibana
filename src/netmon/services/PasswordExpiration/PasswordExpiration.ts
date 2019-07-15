import moment from 'moment';
import HTTP from '../../common/http';
const TIME_ROUTE = '/api/system/time';
const ONE_DAY_MS: number = 86400000;
const SEVEN_DAYS_MS: number = ONE_DAY_MS * 7;
const FIRST_LOGIN_DATE_MS: number = 7776000000;
const updatePasswordLinkMsg: string =
  ' Please update your password on the <a href="/configuration/user" class="alert-link">User</a> page.';

export default class PasswordExpiration {
  private HTTP: HTTP;

  public constructor() {
    this.HTTP = new HTTP();
  }

  public shouldShowBanner(timeUntilExpiredMs: any): boolean {
    return timeUntilExpiredMs < SEVEN_DAYS_MS;
  }

  public getCurrentServerTime(): Promise<any> {
    return this.HTTP.fetch(TIME_ROUTE)
      .then(response => {
        return response
          .json()
          .then(body => {
            if (response.ok) {
              return body;
            }
            return false;
          })
          .catch(reject => {
            console.log('Unable to fetch server time');
          });
      })
      .catch(reject => {
        console.log('Unable to fetch server time');
      });
  }

  public getTimeUntilExpiration(json: any, currentTimeMs: any): any {
    if (!(json && json.passwordExpirationDate)) {
      return false;
    }
    const currentTime = currentTimeMs;
    const expirationDate = moment(json.passwordExpirationDate).valueOf();
    const timeUntilExpirationMs = expirationDate - currentTime;
    return timeUntilExpirationMs;
  }

  public bannerContent(json: any, timeUntilExpiredMs: any): any {
    const expirationDate: string = this.formatExpirationDate(json.passwordExpirationDate);
    const expirationDateInMs = moment(json.passwordExpirationDate).valueOf();
    const expirationInDays = Math.floor(timeUntilExpiredMs / ONE_DAY_MS);

    let title: string = 'Password Expiration Warning';
    const severity = 'alert-danger';
    let content: string = '';

    if (expirationDateInMs === FIRST_LOGIN_DATE_MS) {
      title = 'Notice';
      content = 'You are required to change your password.';
    } else if (timeUntilExpiredMs >= ONE_DAY_MS) {
      content =
        `Your password will expire in ${expirationInDays} day(s) on ${expirationDate}.` +
        updatePasswordLinkMsg;
    } else if (timeUntilExpiredMs > 0) {
      content =
        `Your password expires in less than a day, on ${expirationDate}.` + updatePasswordLinkMsg;
    } else {
      content = 'Your password has expired.';
    }

    return { title, severity, content };
  }

  public formatExpirationDate(dateToFormat: any): any {
    return moment(dateToFormat).format('MMMM Do YYYY, h:mm:ss a');
  }
}
