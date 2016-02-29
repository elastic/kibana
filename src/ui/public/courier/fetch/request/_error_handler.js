import CourierErrorHandlersProvider from 'ui/courier/_error_handlers';
import Notifier from 'ui/notify/notifier';

export default function RequestErrorHandlerFactory(Private) {
  var errHandlers = Private(CourierErrorHandlersProvider);

  var notify = new Notifier({
    location: 'Courier Fetch Error'
  });

  function handleError(req, error) {
    var myHandlers = [];

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
};
