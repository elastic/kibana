export function initBundleApi(chrome, internals) {

  if (!window.sessionStorage) {
    return;
  }

  const existingBundleHash = window.sessionStorage.getItem('kibanaBundleHash');
  const currentBundleHash = internals.bundleHash;

  if (!existingBundleHash) {
    window.sessionStorage.setItem('kibanaBundleHash', currentBundleHash);
    return;
  }

  if (existingBundleHash !== currentBundleHash) {
    alert('Kibana has updated since this tab was opened and it can no longer be used, please open a new tab to use the updated version.');
    throw new Error('Outdated session storage');
  }
}
