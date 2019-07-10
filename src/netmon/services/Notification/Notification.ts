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

   private subscribers: Set<
      (notifications: INotification[]) => void
   > = new Set();

   constructor() {
      this.notifications = [];
   }

   public subscribe(
      subscription: (notifications: INotification[]) => void
   ): () => void {
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
      this.notifications = [
         ...this.notifications,
         {
            onClear,
            severity,
            text,
            title,
            type
         }
      ];

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
      this.notifications = _.without(
         this.notifications,
         _.find(this.notifications, (notification: INotification) => {
            return notification.type === notificationType;
         })
      );

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
