import { useEffect } from 'react';
import Events, { EventName } from '../services/Events';

export const useEvent = (eventName: EventName, handler: () => void) => {
  useEffect(
    () => {
      Events.events.on(eventName, handler);

      return () => {
        Events.events.removeListener(eventName, handler);
      };
    },
    [eventName, handler]
  );
};
