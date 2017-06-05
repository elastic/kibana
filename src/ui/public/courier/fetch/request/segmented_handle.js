import { EventsProvider } from 'ui/events';

export function SegmentedHandleProvider(Private) {
  const Events = Private(EventsProvider);

  const segmentedRequest = Symbol('Actual Segmented Request');

  /**
   * Simple class for creating an object to send to the
   * requester of a SegmentedRequest. Since the SegmentedRequest
   * extends AbstractRequest, it wasn't able to be the event
   * emitter it was born to be. This provides a channel for
   * setting values on the segmented request, and an event
   * emitter for the request to speak outwardly
   *
   * @param {SegmentedRequest} - req - the requst this handle relates to
   */
  return class SegmentedHandle extends Events {
    constructor(req) {
      super();
      this[segmentedRequest] = req;
    }

    setDirection(...args) {
      this[segmentedRequest].setDirection(...args);
    }

    setSize(...args) {
      this[segmentedRequest].setSize(...args);
    }

    setMaxSegments(...args) {
      this[segmentedRequest].setMaxSegments(...args);
    }

    setSortFn(...args) {
      this[segmentedRequest].setSortFn(...args);
    }
  };
}
