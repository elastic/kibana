import * as React from 'react';
import classnames from 'classnames';
import { useNotifications } from '../../../hooks/notification_hooks';
import Notification from '../../../services/Notification/Notification';

const NotificationDisplay = () => {
  const notifications = useNotifications();

  if (!notifications || !notifications.length) {
    return null;
  }

  return (
    <>
      {notifications.map((n, i) => (
        <div
          key={`notification_${i}`}
          className={classnames('alert', n.severity)}
          style={{ opacity: 1.0, zIndex: 9999999 }}
        >
          <button type="button" className="close" onClick={() => Notification.clearNotification(n)}>
            &times;
          </button>
          <strong>
            <h4>{n.title}</h4>
          </strong>{' '}
          <span>{n.text}</span>
          <div className="pull-right small"> {i + 1} alert(s) </div>
        </div>
      ))}
    </>
  );
};

export default NotificationDisplay;
