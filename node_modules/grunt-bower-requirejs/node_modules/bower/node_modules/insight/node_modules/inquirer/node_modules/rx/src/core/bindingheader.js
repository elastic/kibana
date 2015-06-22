  var Observable = Rx.Observable,
    observableProto = Observable.prototype,
    AnonymousObservable = Rx.AnonymousObservable,
    Subject = Rx.Subject,
    AsyncSubject = Rx.AsyncSubject,
    Observer = Rx.Observer,
    ScheduledObserver = Rx.internals.ScheduledObserver,
    disposableCreate = Rx.Disposable.create,
    disposableEmpty = Rx.Disposable.empty,
    CompositeDisposable = Rx.CompositeDisposable,
    currentThreadScheduler = Rx.Scheduler.currentThread,
    isFunction = Rx.helpers.isFunction,
    inherits = Rx.internals.inherits,
    addProperties = Rx.internals.addProperties;

  // Utilities
  var objectDisposed = 'Object has been disposed';
  function checkDisposed(self) { if (self.isDisposed) { throw new Error(objectDisposed); } }
  function cloneArray(arr) { for(var a = [], i = 0, len = arr.length; i < len; i++) { a.push(arr[i]); } return a;}
