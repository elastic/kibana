  var ObservableBase = Rx.ObservableBase = (function (__super__) {

  inherits(ObservableBase, __super__);

  // Fix subscriber to check for undefined or function returned to decorate as Disposable
  function fixSubscriber(subscriber) {
    if (subscriber && typeof subscriber.dispose === 'function') { return subscriber; }

      return typeof subscriber === 'function' ?
        disposableCreate(subscriber) :
        disposableEmpty;
    }

    function setDisposable(s, state) {
      var ado = state[0], self = state[1];
      var sub = tryCatch(self.subscribeCore).call(self, ado);

      if (sub === errorObj) {
        if(!ado.fail(errorObj.e)) { return thrower(errorObj.e); }
      }
      ado.setDisposable(fixSubscriber(sub));
    }

    function subscribe(observer) {
      var ado = new AutoDetachObserver(observer), state = [ado, this];

      if (currentThreadScheduler.scheduleRequired()) {
        currentThreadScheduler.scheduleWithState(state, setDisposable);
      } else {
        setDisposable(null, state);
      }

      return ado;
    }

    function ObservableBase() {
      __super__.call(this, subscribe);
    }

    ObservableBase.prototype.subscribeCore = function(observer) {
      throw new Error('Not implemeneted');
    }

    return ObservableBase;

  }(Observable));
