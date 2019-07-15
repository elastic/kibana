import * as _ from 'lodash';
import HTTP from '../common/http';
import Notification from './Notification/Notification';

export interface IUser {
  licensed: boolean;
  role: string;
  username: string;
  timeToResetPass: boolean;
}

class Auth {
  private HTTP: HTTP;
  private subscribers: Set<(user: IUser | undefined) => void> = new Set();
  public currentUser: IUser | undefined = undefined;

  constructor() {
    this.HTTP = new HTTP();
    if (localStorage.getItem('token')) {
      this.getCurrentUser();
    }
  }

  public subscribe(subscription: (user: IUser | undefined) => void) {
    try {
      subscription(this.currentUser);
    } catch (err) {
      console.error('The subscription to add threw an exception, not subscribing.');
      return;
    }
    this.subscribers.add(subscription);

    return () => {
      this.subscribers.delete(subscription);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(subscription => {
      subscription(this.currentUser);
    });
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
    this.notifySubscribers();
  }

  public logout() {
    this.recordLogoutInAuditLog();
    this.clearClientData();
  }

  public async getCurrentUser(): Promise<any> {
    let shouldNotify: boolean = true;
    try {
      const response = await this.HTTP.fetch('/data/api/auth/');
      const json = await response.json();

      const newUser = json && json.data && json.data.hasOwnProperty('role') ? json.data : undefined;

      shouldNotify = !_.isEqual(newUser, this.currentUser);

      this.currentUser = newUser;
    } catch (err) {
      console.error('An error occurred looking up the current user', err);
      return null;
    }

    try {
      if (shouldNotify) {
        this.notifySubscribers();
      }
    } catch (err) {
      console.error(
        'An error occurred notifying the authentication subscribers of the new user.',
        err
      );
    }

    return this.currentUser;
  }

  private recordLogoutInAuditLog(): Promise<any> {
    let errorMsg: string = 'Error sending logout audit message';

    let route: string = '/api/audit/logout';
    let config: any = { method: 'PUT' };
    let ignoreRequestToken: boolean = false;

    return this.HTTP.fetch(route, config, ignoreRequestToken)
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
