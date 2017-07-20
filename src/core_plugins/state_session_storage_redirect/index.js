export default function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      app: {
        require: ['kibana'],
        title: 'Redirecting',
        id: 'stateSessionStorageRedirect',
        main: 'plugins/state_session_storage_redirect',
        listed: false,
      }
    }
  });
}
