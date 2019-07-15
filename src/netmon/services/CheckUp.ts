import HTTP from '../common/http';
import * as _ from 'lodash';

const FIVE_SECONDS: number = 5 * 1000;

const NOOP: () => void = () => {
  return;
};

class CheckUp {
  private HTTP: HTTP;
  constructor() {
    this.HTTP = new HTTP();
  }

  public doCheckUp(successCallback: () => void = NOOP, failureCallback: () => void = NOOP): void {
    let ignoreRequestToken: boolean = true;
    this.HTTP.fetch(
      '/api/services',
      {
        timeout: FIVE_SECONDS,
      },
      ignoreRequestToken
    )
      .then(response => {
        response
          .json()
          .then(json => {
            if (response.status !== 200 || !this.allStatusesActive(json)) {
              failureCallback();
              setTimeout(() => {
                this.doCheckUp(successCallback, failureCallback);
              }, FIVE_SECONDS);
            } else {
              successCallback();
            }
          })
          .catch(reject => {
            failureCallback();
            setTimeout(() => {
              this.doCheckUp(successCallback, failureCallback);
            }, FIVE_SECONDS);
          });
      })
      .catch(reject => {
        failureCallback();
        setTimeout(() => {
          this.doCheckUp(successCallback, failureCallback);
        }, FIVE_SECONDS);
      });
  }
  private allStatusesActive(statuses: PossibleProcessStatus[]): boolean {
    let allActive: boolean = true;
    _.each(statuses, (process: PossibleProcessStatus) => {
      allActive = allActive && process === 'active';
    });
    return allActive;
  }
}

export type PossibleProcessStatus = 'active' | 'inactive' | 'dead';
export default new CheckUp();
