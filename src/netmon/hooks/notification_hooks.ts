import { useEffect, useState } from 'react';
import Notification, { INotification } from '../services/Notification/Notification';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<INotification[]>([]);

  useEffect(() => {
    return Notification.subscribe(setNotifications);
  }, []);

  return notifications;
};
