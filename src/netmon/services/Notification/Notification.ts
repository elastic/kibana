import { ReactNode } from 'react';
import * as _ from 'lodash';

export interface INotification {
  type: string;
  title: string;
  text: string | ReactNode;
  severity: any;
  onClear: Function;
}

class Notification {
  public notifications: INotification[] = [];

  private subscribers: Set<(notifications: INotification[]) => void> = new Set();

  constructor() {
    this.notifications = [];
  }

  public subscribe(subscription: (notifications: INotification[]) => void): () => void {
    this.subscribers.add(subscription);
    subscription(this.notifications);
    return () => {
      this.subscribers.delete(subscription);
    };
  }

  private triggerSubscribers() {
    this.subscribers.forEach(sub => sub([...this.notifications]));
  }

  public notify(
    type: string,
    title: string = '',
    text: string | ReactNode = '',
    severity = 'alert-warning',
    onClear = _.noop
  ): void {
    const newNotification: INotification = {
      onClear,
      severity,
      text,
      title,
      type,
    };

    if (
      _.find(this.notifications, n => {
        return _.isEqual(_.omit(n, ['onClear']), _.omit(newNotification, ['onClear']));
      })
    ) {
      // already have this notification, don't add it again
      return;
    }

    this.notifications = [...this.notifications, newNotification];

    this.triggerSubscribers();
  }

  public clear(): void {
    this.notifications = [];

    this.triggerSubscribers();
  }

  public clearNotification(notification: INotification): void {
    notification.onClear();
    this.notifications = _.without(this.notifications, notification);

    this.triggerSubscribers();
  }

  public clearAllNotificationsOfType(notificationType: string): void {
    const notificationsWithType = _.find(this.notifications, (notification: INotification) => {
      return notification.type === notificationType;
    });

    if (!notificationsWithType) {
      return;
    }

    this.notifications = _.without(this.notifications, notificationsWithType);

    this.triggerSubscribers();
  }

  public clearAllNotifications(): void {
    this.notifications = [];

    this.triggerSubscribers();
  }

  public hasNotificationOfType(type: string): boolean {
    return _.some(this.notifications, { type: type });
  }
}

export default new Notification();
