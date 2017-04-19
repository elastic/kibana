import { Notifier } from 'ui/notify/notifier';

export function CourierNotifierProvider() {
  return new Notifier({
    location: 'Courier Fetch'
  });
}
