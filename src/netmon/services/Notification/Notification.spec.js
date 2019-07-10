import Notification from './Notification.ts';

describe('Notification Test', () => {
   beforeEach(() => {
      Notification.notifications = [];
   });

   it('should have no notifications if none are added', () => {
      expect(Notification.notifications.length).toBe(0);
   });

   it('should return false for hasNotificationOfType if list is empty', () => {
      expect(Notification.hasNotificationOfType('foo')).toBe(false);
   });

   it("should return false for hasNotificationOfType if type doesn't exist", () => {
      Notification.notify(
         'foo',
         'Here be the title',
         'Here be the text',
         'alert-warning',
         () => {}
      );
      expect(Notification.hasNotificationOfType('bar')).toBe(false);
   });

   it('should return true for hasNotificationOfType if type exists', () => {
      Notification.notify(
         'foo',
         'Here be the title',
         'Here be the text',
         'alert-warning',
         () => {}
      );
      expect(Notification.hasNotificationOfType('foo')).toBe(true);
   });

   it('should clear all notifications', () => {
      Notification.notify(
         'foo',
         'Here be the title',
         'Here be the text',
         'alert-warning',
         () => {}
      );
      Notification.notify(
         'bar',
         'Here be the title',
         'Here be the text',
         'alert-warning',
         () => {}
      );
      Notification.notify(
         'foobar',
         'Here be the title',
         'Here be the text',
         'alert-warning',
         () => {}
      );
      expect(Notification.notifications.length).toBe(3);

      Notification.clearAllNotifications();

      expect(Notification.notifications.length).toBe(0);
   });

   it('should clear all notifications of the specified type', () => {
      expect(Notification.notifications.length).toBe(0);
      Notification.notify(
         'foo',
         'Here be the title',
         'Here be the text',
         'alert-warning',
         () => {}
      );
      Notification.notify(
         'bar',
         'Here be the title',
         'Here be the text',
         'alert-warning',
         () => {}
      );
      Notification.notify(
         'foobar',
         'Here be the title',
         'Here be the text',
         'alert-warning',
         () => {}
      );
      expect(Notification.notifications.length).toBe(3);

      Notification.clearAllNotificationsOfType('fakenews');
      expect(Notification.notifications.length).toBe(3);

      Notification.clearAllNotificationsOfType('foobar');
      expect(Notification.notifications.length).toBe(2);

      Notification.clearAllNotificationsOfType('foo');
      expect(Notification.notifications.length).toBe(1);

      Notification.clearAllNotificationsOfType('bar');
      expect(Notification.notifications.length).toBe(0);
   });
});
