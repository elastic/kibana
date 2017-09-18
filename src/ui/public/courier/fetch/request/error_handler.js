import { Notifier } from 'ui/notify/notifier';

import { errorHandlersQueue } from '../../_error_handlers';

const notify = new Notifier({
  location: 'Courier Fetch Error'
});

export function requestErrorHandler(req, error) {
  const myHandlers = [];

  errorHandlersQueue.splice(0).forEach(function (handler) {
    (handler.source === req.source ? myHandlers : errorHandlersQueue).push(handler);
  });

  if (!myHandlers.length) {
    notify.fatal(new Error(`unhandled courier request error: ${ notify.describeError(error) }`));
  } else {
    myHandlers.forEach(function (handler) {
      handler.defer.resolve(error);
    });
  }
}
