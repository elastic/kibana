import { noop } from 'lodash';

const confirmMessage = `You have unsaved changes. Proceed and discard changes?`;

function registerUrlChangeHandler(checkDirty) {
  this.beforeUnloadHandler = (event) => {
    if (checkDirty()) {
      // Browsers do not honor the message you set here. The only requirement
      // is that is is not an empty string. I am just using the confirmMessage
      // here for consistency
      event.returnValue = confirmMessage;
    }
  };

  // When the user navigates to an external url or another app, we must
  // rely on the build-in beforeunload confirmation dialog. We do not have
  // the ability to change the text or appearance of this dialog.
  this.$window.addEventListener('beforeunload', this.beforeUnloadHandler);
}

function deregisterUrlChangeHandler() {
  this.$window.removeEventListener('beforeunload', this.beforeUnloadHandler);
}

function registerRouteChangeHandler(checkDirty) {
  // When the user navigates within the same app, we can present them with
  // a friendly confirmation dialog box
  const deregister = this.$rootScope.$on('$locationChangeStart', (event, newUrl) => {
    if (!checkDirty()) {
      return;
    }

    // At this point, we know the dirty prompt should be shown, so
    // cancel the location change event, and keep the user at
    // their current location
    event.preventDefault();

    // Notify user about unsaved changes and ask the user for confirmation
    // about navigating away (changing their location) anyway
    const confirmModalOptions = {
      onConfirm: () => {
        this.deregister();
        this.$window.location.href = newUrl;
      },
      confirmButtonText: 'Discard Changes'
    };

    return this.confirmModal(confirmMessage, confirmModalOptions);
  });

  this.deregisterListener = deregister;
}

function deregisterRouteChangeHandler() {
  this.deregisterListener();
}

export class DirtyPrompt {
  constructor($window, $rootScope, confirmModal) {
    this.$window = $window;
    this.$rootScope = $rootScope;
    this.confirmModal = confirmModal;
    this.deregisterListener = noop;
    this.beforeUnloadHandler = noop;
  }

  /**
   * @param checkDirty function which returns a bool to call to
   *   determine dirty state
   */
  register = (checkDirty) => {
    registerUrlChangeHandler.call(this, checkDirty);
    registerRouteChangeHandler.call(this, checkDirty);
  }

  deregister = () => {
    deregisterUrlChangeHandler.call(this);
    deregisterRouteChangeHandler.call(this);
  }
}
