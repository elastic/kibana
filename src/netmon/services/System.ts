import CheckUp from './CheckUp';
import HTTP from '../common/http';

const WAIT_MESSAGES = {
  restartServices: 'Restarting Network Monitor Services. This may take a few minutes.',
  restartReaderAndLogger:
    'Restarting configuration dependent services. This may take a few minutes.',
  reboot: 'Rebooting Network Monitor. This may take a few minutes.',
  shutdown:
    'Shutting down Network Monitor. You will have to physically turn on the server to regain connectivity.',
};

const ONE_SECOND: number = 1000;
const FIVE_SECONDS: number = ONE_SECOND * 5;
const ONE_MINUTE: number = ONE_SECOND * 60;
const TWO_MINUTES: number = ONE_MINUTE * 2;

const NOOP = () => {};

export type CommandMapping<T = string> = {
  restartServices?: T;
  restartReaderAndLogger?: T;
  reboot?: T;
  shutdown?: T;
};

const ROUTES: CommandMapping = {
  restartServices: '/api/services/actions/restart',
  restartReaderAndLogger: '/api/services/actions/restart',
  reboot: '/api/system/actions/reboot',
  shutdown: '/api/system/actions/shutdown',
};

const METHOD: CommandMapping = {
  restartServices: 'PUT',
  restartReaderAndLogger: 'PUT',
  reboot: 'POST',
  shutdown: 'POST',
};

const REQUEST_BODY: CommandMapping<{ services: string[] }> = {
  restartReaderAndLogger: {
    services: ['probereader', 'probelogger'],
  },
};

const CHECKUP_DELAY: CommandMapping<number> = {
  restartServices: ONE_MINUTE,
  restartReaderAndLogger: ONE_MINUTE,
  reboot: TWO_MINUTES,
  // the client will continue to check to see if the box is back up after
  // shutting down, in case the user turns it back on
  shutdown: TWO_MINUTES,
};

export type CommandError = {
  error: boolean;
  message: string;
};

export interface ISystemIdentifiers {
  masterLicenseId: number;
  machineID: string;
}

class System {
  public systemData: ISystemIdentifiers = {
    masterLicenseId: 0,
    machineID: '',
  };

  private HTTP: HTTP;
  constructor() {
    this.HTTP = new HTTP();
  }

  public fetchSystemData() {
    return this.HTTP.fetch('/api/system/identifiers')
      .then(response => {
        return response
          .json()
          .then(body => {
            if (response.status === 200) {
              this.systemData = body;
              return body;
            }
          })
          .catch(err => {
            console.log('Error: ', err);
          });
      })
      .catch(err => {
        console.log('Error: ', err);
      });
  }

  public getSystemData(): Promise<any> {
    if (this.systemData.masterLicenseId) {
      return Promise.resolve(this.systemData);
    }
    return this.fetchSystemData();
  }

  public sendSystemCommand(
    commandType: keyof CommandMapping,
    errorCallback: (error: CommandError) => void,
    successCallback = NOOP
  ): void {
    // only the restartServices command sends a response
    let isRestartingServices: boolean = commandType === 'restartServices';

    let options: any = {
      method: METHOD[commandType],
      timeout: FIVE_SECONDS,
    };

    if (REQUEST_BODY[commandType]) {
      options['body'] = JSON.stringify(REQUEST_BODY[commandType]);
    }

    const route = ROUTES[commandType];
    if (!route) {
      return;
    }

    this.HTTP.fetch(route, options)
      .then((response: any) => {
        if (isRestartingServices) {
          response
            .json()
            .then((data: any) => {
              if (!data.error && response.status === 200) {
                setTimeout(() => {
                  CheckUp.doCheckUp(successCallback);
                }, CHECKUP_DELAY[commandType]);
              } else {
                errorCallback({
                  error: true,
                  message: data.message,
                });
              }
            })
            .catch(() => {
              setTimeout(() => {
                CheckUp.doCheckUp(successCallback);
              }, CHECKUP_DELAY[commandType]);
            });
        } else {
          if (response.status === 200) {
            setTimeout(() => {
              CheckUp.doCheckUp(successCallback);
            }, CHECKUP_DELAY[commandType]);
          } else {
            errorCallback({
              error: true,
              message: 'Encountered a problem, cannot complete request.',
            });
          }
        }
      })
      .catch((reject: any) => {
        if (reject.status === 0 || commandType === 'shutdown') {
          // request timed out
          setTimeout(CheckUp.doCheckUp, CHECKUP_DELAY[commandType]);
        } else {
          errorCallback({
            error: true,
            message: 'Encountered a problem, cannot complete request.',
          });
        }
      });
  }
}

export default new System();
