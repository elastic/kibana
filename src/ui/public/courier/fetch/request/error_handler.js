import Notifier from 'ui/notify/notifier';

import ErrorHandlersProvider from '../../_error_handlers';

export default function RequestErrorHandlerFactory(Private) {
  const errHandlers = Private(ErrorHandlersProvider);

  const notify = new Notifier({
    location: 'Courier Fetch Error'
  });

  function handleError(req, error) {
    const myHandlers = [];

    errHandlers.splice(0).forEach(function (handler) {
      (handler.source === req.source ? myHandlers : errHandlers).push(handler);
    });

    if (!myHandlers.length) {
      notify.fatal(new Error(`unhandled courier request error: ${ notify.describeError(error) }`));
    } else {
      myHandlers.forEach(function (handler) {
        handler.defer.resolve(error);
      });
    }
  }

  return handleError;
}
