import HTTP from '../common/HTTP';
import Notification from './Notification/Notification';

export interface IUser {
  licensed: boolean;
  role: string;
  username: string;
  timeToResetPass: boolean;
}

class Auth {
  private HTTP: HTTP;
  public currentUser: IUser | undefined = undefined;

  constructor() {
    this.HTTP = new HTTP();
    if (localStorage.getItem('token')) {
      this.getCurrentUser();
    }
  }

  public isAdmin(): Promise<boolean> {
    if (this.currentUser) {
      return Promise.resolve(this.currentUser.role === 'admin');
    }
    return this.getCurrentUser()
      .then(user => {
        return Promise.resolve(!!this.currentUser && this.currentUser.role === 'admin');
      })
      .catch(err => {
        return Promise.resolve(false);
      });
  }

  public isLoggedIn(): Promise<boolean> {
    if (!localStorage.getItem('token')) return Promise.resolve(false);
    return this.getCurrentUser()
      .then(user => {
        if (user && user.hasOwnProperty('role')) {
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      })
      .catch(err => {
        return Promise.resolve(false);
      });
  }

  public isLicensed(): Promise<boolean> {
    if (this.currentUser) {
      return Promise.resolve(this.currentUser.licensed);
    }
    return this.getCurrentUser()
      .then(user => {
        if (user && user.licensed) {
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      })
      .catch(err => {
        return Promise.resolve(false);
      });
  }

  private isTimeToResetPass(): Promise<boolean> {
    if (this.currentUser) {
      return Promise.resolve(this.currentUser.timeToResetPass);
    }
    return this.getCurrentUser()
      .then(user => {
        if (user && user.timeToResetPass) {
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      })
      .catch(err => {
        return Promise.resolve(false);
      });
  }

  public clearCurrentUser(): void {
    this.currentUser = undefined;
  }

  public logout() {
    this.recordLogoutInAuditLog();
    this.clearClientData();
  }

  public getCurrentUser(): Promise<any> {
    return this.HTTP.fetch('/data/api/auth/').then(response => {
      return response
        .json()
        .then(json => {
          return new Promise((resolve, reject) => {
            if (json.data) {
              this.currentUser = json.data;
              if (json.data.hasOwnProperty('role')) {
                resolve(this.currentUser);
              }
            } else {
              reject(new Error('Unauthorized'));
            }
          });
        })
        .catch(err => false);
    });
  }

  private recordLogoutInAuditLog(): Promise<any> {
    let errorMsg: string = 'Error sending logout audit message';

    let route: string = '/api/audit/logout';
    let config: any = { method: 'PUT' };
    let ignoreRequestToken: boolean = false;
    let ignoreResponseToken: boolean = true;

    return this.HTTP.fetch(route, config, ignoreRequestToken, ignoreResponseToken)
      .then(response => {
        return response
          .json()
          .then(json => {
            return new Promise((resolve, reject) => {
              if (response.status !== 200) {
                console.log(errorMsg + ' (' + response.status + '): ' + json.message);
              }
              resolve();
            });
          })
          .catch(err => {
            console.log(errorMsg + ': ' + err);
            return Promise.resolve();
          });
      })
      .catch(err => {
        console.log(errorMsg + ': ' + err);
        return Promise.resolve();
      });
  }

  private clearClientData(): void {
    this.clearCurrentUser();
    localStorage.setItem('token', '');
    Notification.clearAllNotifications();
  }
}

export default new Auth();
