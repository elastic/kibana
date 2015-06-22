  var AnonymousObservable = Rx.AnonymousObservable = (function (__super__) {
    inherits(AnonymousObservable, __super__);

    // Fix subscriber to check for undefined or function returned to decorate as Disposable
    function fixSubscriber(subscriber) {
      if (subscriber && typeof subscriber.dispose === 'function') { return subscriber; }

      return typeof subscriber === 'function' ?
        disposableCreate(subscriber) :
        disposableEmpty;
    }

    function setDisposable(s, state) {
      var ado = state[0], subscribe = state[1];
      try {
        ado.setDisposable(fixSubscriber(subscribe(ado)));
      } catch (e) {
        if (!ado.fail(e)) { throw e; }
      }
    }

    function AnonymousObservable(subscribe, parent) {
      this.source = parent;

      function s(observer) {

        var ado = new AutoDetachObserver(observer), state = [ado, subscribe];

        if (currentThreadScheduler.scheduleRequired()) {
          currentThreadScheduler.scheduleWithState(state, setDisposable);
        } else {
          setDisposable(null, state);
        }

        return ado;
      }

      __super__.call(this, s);
    }

    return AnonymousObservable;

  }(Observable));
