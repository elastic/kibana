define(function (require) {
  return function CourierFetchNotifier(Notifier) {
    return new Notifier({
      location: 'Courier Fetch'
    });
  };
});
